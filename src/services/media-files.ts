import { mkdir, open, rm, stat } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { db } from '@/lib/db';
import { fetchRemoteMedia } from '@/lib/remote-media';

const mediaRoot = resolve(process.env.MEDIA_DIR ?? './storage');
const maxBytes = Number(process.env.MAX_MEDIA_BYTES ?? 536_870_912);

export function mediaPath(fileName: string) {
  return resolve(mediaRoot, basename(fileName));
}

export async function removeStoredFile(fileName: string | null) {
  if (fileName) await rm(mediaPath(fileName), { force: true }).catch(() => undefined);
}

export async function runRealDownload(id: string) {
  const active = await db.download.findFirst({
    where: { real: true, status: { in: ['queued', 'processing'] }, paused: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (active?.id !== id) return;
  const job = await db.download.findUnique({ where: { id } });
  if (!job?.real || !job.sourceUrl || !['queued', 'processing'].includes(job.status) || job.paused)
    return;
  await mkdir(mediaRoot, { recursive: true });
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
  let releasedQueue = false;
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
    releasedQueue = true;
  } catch (error) {
    await db.download.updateMany({
      where: { id },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message.slice(0, 240) : 'Download failed',
      },
    });
    releasedQueue = true;
  } finally {
    await closeRemote?.();
    await handle.close();
  }
  if (releasedQueue) {
    const next = await db.download.findFirst({
      where: { real: true, status: 'queued', paused: false },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (next) await runRealDownload(next.id);
  }
}
