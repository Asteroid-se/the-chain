import { z } from 'zod';
import { endpoint, ok } from '@/lib/api';
import { db } from '@/lib/db';
import { getDownloads } from '@/services/downloads';
import { removeStoredFile, runRealDownload } from '@/services/media-files';
import { after } from 'next/server';
const filters = z.object({
  scope: z.enum(['queue', 'history']).default('queue'),
  search: z.string().max(200).default(''),
  provider: z.enum(['all', 'YouTube', 'Instagram', 'TikTok', 'Generic']).default('all'),
  type: z.enum(['all', 'video', 'audio', 'image']).default('all'),
});
export async function GET(request: Request) {
  return endpoint(async () => {
    const downloads = await getDownloads(
      filters.parse(Object.fromEntries(new URL(request.url).searchParams)),
    );
    const next = await db.download.findFirst({
      where: { real: true, status: { in: ['queued', 'processing'] }, paused: false },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (next) after(() => runRealDownload(next.id));
    return ok(downloads);
  });
}
export async function DELETE() {
  return endpoint(async () => {
    const completed = await db.download.findMany({
      where: { status: 'completed' },
      select: { filePath: true },
    });
    const result = await db.download.deleteMany({ where: { status: 'completed' } });
    await Promise.all(completed.map(({ filePath }) => removeStoredFile(filePath)));
    return ok(result);
  });
}
