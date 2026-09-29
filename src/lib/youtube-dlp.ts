import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ApiError } from '@/lib/api';
import type { Media, MediaFormat, MediaType } from '@/types/media';

const execFileAsync = promisify(execFile);
const mediaRoot = resolve(process.env.MEDIA_DIR ?? './storage');
const maxMediaBytes = Number(process.env.MAX_MEDIA_BYTES ?? 536_870_912);

type YoutubeFormat = {
  ext?: string;
  vcodec?: string;
  acodec?: string;
  height?: number;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number;
  abr?: number;
  has_drm?: boolean;
};

type YoutubeInfo = {
  title?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  thumbnail?: string;
  is_live?: boolean;
  live_status?: string;
  availability?: string;
  formats?: YoutubeFormat[];
};

export const youtubeSelections: Record<
  string,
  {
    mediaType: MediaType;
    extension: string;
    quality: string;
    selector: string;
    audioFormat?: string;
  }
> = {
  'youtube-mp4-1080': {
    mediaType: 'video',
    extension: 'mp4',
    quality: '1080p',
    selector: 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]',
  },
  'youtube-mp4-720': {
    mediaType: 'video',
    extension: 'mp4',
    quality: '720p',
    selector: 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]',
  },
  'youtube-mp4-480': {
    mediaType: 'video',
    extension: 'mp4',
    quality: '480p',
    selector: 'bv*[height<=480][ext=mp4]+ba[ext=m4a]/b[height<=480][ext=mp4]',
  },
  'youtube-mp3': {
    mediaType: 'audio',
    extension: 'mp3',
    quality: 'Best audio',
    selector: 'ba/b',
    audioFormat: 'mp3',
  },
  'youtube-m4a': {
    mediaType: 'audio',
    extension: 'm4a',
    quality: 'Best audio',
    selector: 'ba[ext=m4a]',
    audioFormat: 'm4a',
  },
};

export function ytDlpExecutable() {
  if (process.env.YTDLP_PATH) return process.env.YTDLP_PATH;
  const local = resolve(
    process.cwd(),
    '.tools',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp',
  );
  return existsSync(local) ? local : 'yt-dlp';
}

function humanDuration(value?: number) {
  if (!value || value < 0) return null;
  const seconds = Math.round(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const tail = String(seconds % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${tail}` : `${minutes}:${tail}`;
}

function bytesFor(format: YoutubeFormat, duration: number, fallbackRate: number) {
  return (
    format.filesize ??
    format.filesize_approx ??
    Math.round((duration * ((format.tbr ?? format.abr ?? fallbackRate) * 1000)) / 8)
  );
}

function estimateVideo(formats: YoutubeFormat[], height: number, duration: number) {
  const videos = formats
    .filter(
      (format) =>
        !format.has_drm &&
        format.vcodec &&
        format.vcodec !== 'none' &&
        format.ext === 'mp4' &&
        (format.height ?? 0) <= height,
    )
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0) || (b.tbr ?? 0) - (a.tbr ?? 0));
  const selected = videos[0];
  if (!selected) return null;
  const audio = formats
    .filter(
      (format) =>
        !format.has_drm &&
        format.acodec &&
        format.acodec !== 'none' &&
        (!format.vcodec || format.vcodec === 'none') &&
        format.ext === 'm4a',
    )
    .sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0))[0];
  const videoBytes = bytesFor(
    selected,
    duration,
    height >= 1080 ? 4_500 : height >= 720 ? 2_500 : 1_200,
  );
  const audioBytes =
    selected.acodec && selected.acodec !== 'none' ? 0 : audio ? bytesFor(audio, duration, 160) : 0;
  return { size: Math.max(1, videoBytes + audioBytes), height: selected.height ?? height };
}

function youtubeFormats(info: YoutubeInfo): MediaFormat[] {
  const formats = info.formats ?? [];
  const duration = Math.max(1, info.duration ?? 1);
  const result: MediaFormat[] = [];
  const videoHeights = new Set<number>();
  for (const height of [1080, 720, 480]) {
    const estimate = estimateVideo(formats, height, duration);
    if (estimate && estimate.size <= maxMediaBytes && !videoHeights.has(estimate.height)) {
      videoHeights.add(estimate.height);
      result.push({
        id: `youtube-mp4-${height}`,
        label: 'MP4',
        extension: 'mp4',
        quality: `${estimate.height}p`,
        mediaType: 'video',
        fileSize: estimate.size,
        mimeType: 'video/mp4',
      });
    }
  }
  const audioFormats = formats
    .filter((format) => !format.has_drm && format.acodec && format.acodec !== 'none')
    .sort((a, b) => (b.abr ?? 0) - (a.abr ?? 0));
  const bestAudio = audioFormats[0];
  const bestM4a = audioFormats.find((format) => format.ext === 'm4a');
  if (bestAudio) {
    const audioSize = Math.max(1, bytesFor(bestAudio, duration, 192));
    if (audioSize <= maxMediaBytes)
      result.push({
        id: 'youtube-mp3',
        label: 'MP3',
        extension: 'mp3',
        quality: 'Best audio',
        mediaType: 'audio',
        fileSize: audioSize,
        mimeType: 'audio/mpeg',
      });
  }
  if (bestM4a) {
    const m4aSize = Math.max(1, bytesFor(bestM4a, duration, 160));
    if (m4aSize <= maxMediaBytes)
      result.push({
        id: 'youtube-m4a',
        label: 'M4A',
        extension: 'm4a',
        quality: 'Best audio',
        mediaType: 'audio',
        fileSize: m4aSize,
        mimeType: 'audio/mp4',
      });
  }
  return result;
}

function readableYtDlpError(error: unknown) {
  const value = error as { code?: string; stderr?: string; killed?: boolean };
  if (value.code === 'ENOENT')
    return 'YouTube support is not installed on this server. Install yt-dlp and FFmpeg, then try again.';
  if (value.killed) return 'YouTube took too long to respond. Please try again.';
  const last = value.stderr
    ?.split(/\r?\n/)
    .map((line) => line.replace(/^ERROR:\s*/i, '').trim())
    .filter(Boolean)
    .at(-1);
  return last?.slice(0, 240) || 'YouTube could not read this public video.';
}

export async function analyzeYoutube(url: URL): Promise<Media> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      ytDlpExecutable(),
      [
        '--ignore-config',
        '--js-runtimes',
        'node',
        '--no-playlist',
        '--no-warnings',
        '--skip-download',
        '--dump-single-json',
        '--socket-timeout',
        '15',
        '--retries',
        '2',
        url.href,
      ],
      { timeout: 45_000, maxBuffer: 20 * 1024 * 1024, windowsHide: true },
    ));
  } catch (error) {
    throw new ApiError(readableYtDlpError(error), 422);
  }
  let info: YoutubeInfo;
  try {
    info = JSON.parse(stdout);
  } catch {
    throw new ApiError('YouTube returned unreadable metadata. Please try again.', 502);
  }
  if (info.is_live || info.live_status === 'is_live')
    throw new ApiError('Live streams are not supported. Use a completed public video.', 422);
  if (
    ['private', 'premium_only', 'subscriber_only', 'needs_auth'].includes(info.availability ?? '')
  )
    throw new ApiError('This video is not publicly downloadable without an account.', 403);
  const formats = youtubeFormats(info);
  if (!formats.length)
    throw new ApiError('No non-DRM MP4 or audio formats are available for this video.', 422);
  return {
    url: url.href,
    provider: 'YouTube',
    title: info.title?.slice(0, 300) || 'YouTube video',
    author: (info.uploader ?? info.channel ?? 'YouTube').slice(0, 200),
    duration: humanDuration(info.duration),
    thumbnail: info.thumbnail ?? 'landscape',
    formats,
    demo: false,
  };
}

export function spawnYoutubeDownload(
  url: string,
  formatId: string,
  id: string,
  maxBytes: number,
): ChildProcess {
  const selection = youtubeSelections[formatId];
  if (!selection) throw new Error('The selected YouTube format is no longer available.');
  const output = resolve(mediaRoot, `${basename(id)}.%(ext)s`);
  const args = [
    '--ignore-config',
    '--js-runtimes',
    'node',
    '--no-playlist',
    '--no-warnings',
    '--newline',
    '--progress',
    '--progress-delta',
    '0.5',
    '--progress-template',
    'download:CHAIN:%(progress.downloaded_bytes)s:%(progress.total_bytes)s:%(progress.total_bytes_estimate)s',
    '--socket-timeout',
    '15',
    '--retries',
    '3',
    '--fragment-retries',
    '3',
    '--max-filesize',
    String(maxBytes),
    '--continue',
    '--no-overwrites',
    '-f',
    selection.selector,
    '-o',
    output,
  ];
  if (selection.audioFormat === 'mp3')
    args.push('--extract-audio', '--audio-format', selection.audioFormat);
  else if (selection.mediaType === 'video') args.push('--merge-output-format', 'mp4');
  args.push(url);
  return spawn(ytDlpExecutable(), args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
}

export async function findYoutubeOutput(id: string) {
  const prefix = `${basename(id)}.`;
  const files = await readdir(mediaRoot);
  const candidates = files.filter(
    (name) => name.startsWith(prefix) && !name.endsWith('.part') && !name.endsWith('.ytdl'),
  );
  const entries = await Promise.all(
    candidates.map(async (name) => ({ name, details: await stat(resolve(mediaRoot, name)) })),
  );
  return entries.sort((a, b) => b.details.mtimeMs - a.details.mtimeMs)[0] ?? null;
}

export function mimeForExtension(extension: string) {
  if (extension === 'mp3') return 'audio/mpeg';
  if (extension === 'm4a') return 'audio/mp4';
  if (extension === 'mp4') return 'video/mp4';
  if (extension === 'webm') return 'video/webm';
  return 'application/octet-stream';
}
