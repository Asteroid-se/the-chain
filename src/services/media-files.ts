import { mkdir, open, readdir, rm, stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { db } from '@/lib/db';
import { fetchRemoteMedia } from '@/lib/remote-media';
import {
  findYoutubeOutput,
  mimeForExtension,
  spawnYoutubeDownload,
  youtubeSelections,
} from '@/lib/youtube-dlp';

const mediaRoot = resolve(process.env.MEDIA_DIR ?? './storage');
const maxBytes = Number(process.env.MAX_MEDIA_BYTES ?? 536_870_912);
const running = new Set<string>();

export function mediaPath(fileName: string) {
  return resolve(mediaRoot, basename(fileName));
}

export async function removeStoredFile(fileName: string | null) {
  if (!fileName) return;
  await mkdir(mediaRoot, { recursive: true });
  const safeName = basename(fileName);
  const stem = safeName.slice(0, Math.max(0, safeName.length - extname(safeName).length));
  const files = await readdir(mediaRoot).catch(() => []);
  await Promise.all(
    files
      .filter((name) => name === safeName || name.startsWith(`${stem}.`))
      .map((name) => rm(mediaPath(name), { force: true }).catch(() => undefined)),
  );
}

async function runDirectDownload(id: string) {
  const job = await db.download.findUnique({ where: { id } });
  if (!job?.sourceUrl) return;
  const fileName = job.filePath ?? `${job.id}.${job.format}`;
  const target = mediaPath(fileName);
  const diskSize = await stat(target)
    .then((entry) => entry.size)
    .catch(() => 0);
  if (diskSize > job.fileSize) await rm(target, { force: true });
  const offset = diskSize <= job.fileSize ? diskSize : 0;
  if (offset === job.fileSize) {
    await db.download.update({
      where: { id },
      data: { status: 'completed', progress: 100, completedAt: new Date(), filePath: fileName },
    });
    return;
  }
  await db.download.update({
    where: { id },
    data: { status: 'processing', filePath: fileName, error: null },
  });
  const handle = await open(target, offset ? 'a' : 'w');
  let closeRemote: (() => Promise<void>) | null = null;
  try {
    const { response, finalUrl, close } = await fetchRemoteMedia(new URL(job.sourceUrl), offset);
    closeRemote = close;
    if (!response.ok && response.status !== 206)
      throw new Error(`Origin returned HTTP ${response.status}`);
    let written = offset;
    if (offset && response.status !== 206) {
      await handle.truncate(0);
      written = 0;
    }
    if (!response.body) throw new Error('Origin returned an empty response');
    const reader = response.body.getReader();
    let lastUpdate = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      written += value.byteLength;
      if (written > maxBytes || written > job.fileSize + 65_536)
        throw new Error('Origin exceeded the declared file size');
      await handle.write(value);
      if (Date.now() - lastUpdate > 400) {
        const state = await db.download.findUnique({
          where: { id },
          select: { paused: true, status: true },
        });
        if (!state || state.paused || state.status !== 'processing') {
          await reader.cancel();
          return;
        }
        await db.download.update({
          where: { id },
          data: { progress: Math.min(99, Math.floor((written / job.fileSize) * 100)) },
        });
        lastUpdate = Date.now();
      }
    }
    if (written !== job.fileSize)
      throw new Error(`Origin ended early (${written} of ${job.fileSize} bytes)`);
    await db.download.updateMany({
      where: { id },
      data: {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        sourceUrl: finalUrl.href,
        fileSize: written,
      },
    });
  } finally {
    await closeRemote?.();
    await handle.close();
  }
}

function parseProgressLine(line: string) {
  const match = line.match(/CHAIN:(\d+|NA):(\d+|NA):(\d+|NA)/);
  if (!match) return null;
  const downloaded = Number(match[1]);
  const total = Number(match[2] === 'NA' ? match[3] : match[2]);
  if (!Number.isFinite(downloaded) || !Number.isFinite(total) || total <= 0) return null;
  return Math.min(99, Math.max(0, Math.floor((downloaded / total) * 100)));
}

async function runYoutubeDownload(id: string) {
  const job = await db.download.findUnique({ where: { id } });
  if (!job?.sourceUrl || !job.sourceFormat || !youtubeSelections[job.sourceFormat])
    throw new Error('The selected YouTube format is no longer available.');
  await db.download.update({
    where: { id },
    data: { status: 'processing', error: null },
  });
  const child = spawnYoutubeDownload(job.sourceUrl, job.sourceFormat, id, maxBytes);
  let stopped = false;
  let lastProgress = -1;
  let stderr = '';
  let buffered = '';
  let progressWrite: Promise<unknown> = Promise.resolve();
  const consume = (chunk: Buffer | string) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? '';
    for (const line of lines) {
      const progress = parseProgressLine(line);
      if (progress !== null && progress !== lastProgress) {
        lastProgress = progress;
        progressWrite = progressWrite
          .then(() => db.download.updateMany({ where: { id }, data: { progress } }))
          .catch(() => undefined);
      }
    }
  };
  child.stdout?.on('data', consume);
  child.stderr?.on('data', (chunk: Buffer | string) => {
    const value = chunk.toString();
    stderr = `${stderr}${value}`.slice(-8_000);
    consume(value);
  });
  const monitor = setInterval(() => {
    void db.download
      .findUnique({ where: { id }, select: { paused: true, status: true } })
      .then((state) => {
        if (!state || state.paused || state.status !== 'processing') {
          stopped = true;
          child.kill('SIGTERM');
        }
      })
      .catch(() => undefined);
  }, 500);
  const code = await new Promise<number | null>((resolveExit, reject) => {
    child.once('error', reject);
    child.once('close', resolveExit);
  }).finally(() => clearInterval(monitor));
  await progressWrite;
  if (stopped) return;
  if (code !== 0) {
    const message = stderr
      .split(/\r?\n/)
      .map((line) => line.replace(/^ERROR:\s*/i, '').trim())
      .filter(Boolean)
      .at(-1);
    throw new Error(message?.slice(0, 240) || `yt-dlp exited with code ${code}`);
  }
  const output = await findYoutubeOutput(id);
  if (!output) throw new Error('YouTube finished without creating a media file.');
  if (output.details.size > maxBytes) {
    await removeStoredFile(output.name);
    throw new Error('The downloaded media exceeds the server size limit.');
  }
  const extension = extname(output.name).slice(1).toLowerCase();
  await db.download.updateMany({
    where: { id },
    data: {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
      filePath: output.name,
      fileSize: output.details.size,
      format: extension,
      mimeType: mimeForExtension(extension),
    },
  });
}

export async function runRealDownload(id: string) {
  if (running.has(id)) return;
  const active = await db.download.findFirst({
    where: { real: true, status: { in: ['queued', 'processing'] }, paused: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (active?.id !== id) return;
  if (running.has(id)) return;
  const job = await db.download.findUnique({ where: { id } });
  if (!job?.real || !job.sourceUrl || !['queued', 'processing'].includes(job.status) || job.paused)
    return;
  running.add(id);
  await mkdir(mediaRoot, { recursive: true });
  try {
    if (job.provider === 'YouTube') await runYoutubeDownload(id);
    else await runDirectDownload(id);
  } catch (error) {
    await db.download.updateMany({
      where: { id },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message.slice(0, 240) : 'Download failed',
      },
    });
  } finally {
    running.delete(id);
  }
  const next = await db.download.findFirst({
    where: { real: true, status: 'queued', paused: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (next) await runRealDownload(next.id);
}
