import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { db } from '@/lib/db';
import { mediaPath } from '@/services/media-files';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const job = await db.download.findUnique({ where: { id } });
  if (!job?.filePath || job.status !== 'completed')
    return Response.json(
      { success: false, data: null, error: 'Downloaded file not found.' },
      { status: 404 },
    );
  const path = mediaPath(job.filePath);
  const file = await stat(path).catch(() => null);
  if (!file?.isFile())
    return Response.json(
      { success: false, data: null, error: 'Downloaded file is missing.' },
      { status: 404 },
    );
  const cleanTitle = job.title.replace(/[^\p{L}\p{N}._ -]+/gu, '_').slice(0, 120) || 'media';
  const fileName = `${cleanTitle}.${job.format}`;
  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
  return new Response(stream, {
    headers: {
      'Content-Type': job.mimeType ?? 'application/octet-stream',
      'Content-Length': String(file.size),
      'Content-Disposition': `attachment; filename="download.${job.format}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
