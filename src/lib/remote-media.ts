import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { basename, extname } from 'node:path';
import { Agent, fetch } from 'undici';
import { ApiError } from './api';
import type { MediaType } from '@/types/media';

const allowedTypes: Record<string, { extension: string; mediaType: MediaType }> = {
  'video/mp4': { extension: 'mp4', mediaType: 'video' },
  'video/webm': { extension: 'webm', mediaType: 'video' },
  'video/quicktime': { extension: 'mov', mediaType: 'video' },
  'audio/mpeg': { extension: 'mp3', mediaType: 'audio' },
  'audio/mp4': { extension: 'm4a', mediaType: 'audio' },
  'audio/ogg': { extension: 'ogg', mediaType: 'audio' },
  'audio/wav': { extension: 'wav', mediaType: 'audio' },
  'image/jpeg': { extension: 'jpg', mediaType: 'image' },
  'image/png': { extension: 'png', mediaType: 'image' },
  'image/webp': { extension: 'webp', mediaType: 'image' },
  'image/gif': { extension: 'gif', mediaType: 'image' },
};

export interface RemoteMediaInfo {
  finalUrl: string;
  mimeType: string;
  extension: string;
  mediaType: MediaType;
  size: number;
  title: string;
  resumable: boolean;
}

function isPrivateIp(address: string): boolean {
  const normalized = address.toLowerCase();
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split('.').map(Number);
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized)
  )
    return true;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? isPrivateIp(mapped) : false;
}

export async function assertPublicUrl(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw new ApiError('Only HTTP and HTTPS media URLs are supported.');
  if (url.username || url.password)
    throw new ApiError('URLs containing credentials are not allowed.');
  if (url.port && !['80', '443'].includes(url.port))
    throw new ApiError('Only standard HTTP and HTTPS ports are allowed.');
  const addresses = await lookup(url.hostname, { all: true, verbatim: true }).catch(() => {
    throw new ApiError('The media host could not be resolved.');
  });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address)))
    throw new ApiError('Private or local network addresses are not allowed.');
  return addresses;
}

async function safeFetch(start: URL, init: { method?: 'HEAD'; headers?: Record<string, string> }) {
  let current = start;
  for (let redirects = 0; redirects <= 4; redirects++) {
    const addresses = await assertPublicUrl(current);
    const dispatcher = new Agent({
      connect: {
        lookup: (_hostname, options, callback) => {
          const requestedFamily = typeof options === 'number' ? options : options.family;
          const matching = addresses.filter(
            ({ family }) => !requestedFamily || family === requestedFamily,
          );
          if (typeof options !== 'number' && options.all) {
            callback(null, matching.length ? matching : addresses);
            return;
          }
          const selected = matching[0] ?? addresses[0];
          callback(null, selected.address, selected.family);
        },
      },
    });
    let response;
    try {
      response = await fetch(current, {
        ...init,
        headers: { 'Accept-Encoding': 'identity', ...init.headers },
        redirect: 'manual',
        signal: AbortSignal.timeout(15_000),
        dispatcher,
      });
    } catch (error) {
      await dispatcher.close();
      throw error;
    }
    if (![301, 302, 303, 307, 308].includes(response.status))
      return { response, finalUrl: current, close: () => dispatcher.close() };
    const location = response.headers.get('location');
    await response.body?.cancel();
    await dispatcher.close();
    if (!location) throw new ApiError('The media server returned an invalid redirect.');
    current = new URL(location, current);
  }
  throw new ApiError('The media URL redirected too many times.');
}

export async function inspectRemoteMedia(url: URL): Promise<RemoteMediaInfo> {
  let result = await safeFetch(url, { method: 'HEAD' });
  if (!result.response.ok || !result.response.headers.get('content-type')) {
    await result.response.body?.cancel();
    result = await safeFetch(url, { headers: { Range: 'bytes=0-0' } });
  }
  const { response, finalUrl, close } = result;
  if (!response.ok && response.status !== 206) {
    await response.body?.cancel();
    await close();
    throw new ApiError(`The media server responded with HTTP ${response.status}.`);
  }
  const mimeType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
  const format = allowedTypes[mimeType];
  const rangeSize = response.headers.get('content-range')?.match(/\/(\d+)$/)?.[1];
  const size = Number(rangeSize ?? response.headers.get('content-length') ?? 0);
  const maxBytes = Number(process.env.MAX_MEDIA_BYTES ?? 536_870_912);
  await response.body?.cancel();
  await close();
  if (!format)
    throw new ApiError('This URL is not a supported direct video, audio, or image file.');
  if (!Number.isSafeInteger(size) || size <= 0)
    throw new ApiError('The media server must provide a valid file size.');
  if (size > maxBytes)
    throw new ApiError(`This file exceeds the ${Math.round(maxBytes / 1048576)} MB limit.`);
  let decodedPath = finalUrl.pathname;
  try {
    decodedPath = decodeURIComponent(decodedPath);
  } catch {
    // Keep the encoded path when an origin sends malformed escapes.
  }
  const rawName = basename(decodedPath) || `media.${format.extension}`;
  const title =
    rawName
      .slice(0, extname(rawName) ? -extname(rawName).length : undefined)
      .replace(/[\r\n]/g, ' ')
      .slice(0, 180) || 'Direct media file';
  return {
    finalUrl: finalUrl.href,
    mimeType,
    extension: format.extension,
    mediaType: format.mediaType,
    size,
    title,
    resumable: response.headers.get('accept-ranges')?.toLowerCase() === 'bytes',
  };
}

export async function fetchRemoteMedia(url: URL, offset: number) {
  return safeFetch(url, { headers: offset ? { Range: `bytes=${offset}-` } : undefined });
}
