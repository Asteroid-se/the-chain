import { z } from 'zod';
import { endpoint, ok } from '@/lib/api';
import { db } from '@/lib/db';
import { getDownloads } from '@/services/downloads';
const filters = z.object({
  scope: z.enum(['queue', 'history']).default('queue'),
  search: z.string().max(200).default(''),
  provider: z.enum(['all', 'YouTube', 'Instagram', 'TikTok', 'Generic']).default('all'),
  type: z.enum(['all', 'video', 'audio', 'image']).default('all'),
});
export async function GET(request: Request) {
  return endpoint(async () =>
    ok(await getDownloads(filters.parse(Object.fromEntries(new URL(request.url).searchParams)))),
  );
}
export async function DELETE() {
  return endpoint(async () => ok(await db.download.deleteMany({ where: { status: 'completed' } })));
}
