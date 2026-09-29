import { db } from '@/lib/db';
import { reconcileQueue } from './queue';
export async function getDownloads(filters: {
  scope: string;
  search: string;
  provider: string;
  type: string;
}) {
  await reconcileQueue();
  const downloads = await db.download.findMany({
    where: {
      ...(filters.scope === 'history' ? { status: 'completed' } : { status: { not: 'completed' } }),
      ...(filters.search ? { title: { contains: filters.search } } : {}),
      ...(filters.provider !== 'all' ? { provider: filters.provider } : {}),
      ...(filters.type !== 'all' ? { mediaType: filters.type } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return downloads.map(({ filePath, sourceUrl, ...download }) => {
    void sourceUrl;
    return {
      ...download,
      hasFile: download.status === 'completed' && Boolean(filePath),
    };
  });
}
export async function getStats() {
  await reconcileQueue();
  const [total, videos, audio, images, size, platforms] = await Promise.all([
    db.download.count({ where: { status: 'completed' } }),
    db.download.count({ where: { status: 'completed', mediaType: 'video' } }),
    db.download.count({ where: { status: 'completed', mediaType: 'audio' } }),
    db.download.count({ where: { status: 'completed', mediaType: 'image' } }),
    db.download.aggregate({ where: { status: 'completed' }, _sum: { fileSize: true } }),
    db.download.groupBy({
      by: ['provider'],
      where: { status: 'completed' },
      _count: { provider: true },
      orderBy: { _count: { provider: 'desc' } },
      take: 1,
    }),
  ] as const);
  return {
    total,
    videos,
    audio,
    images,
    bytes: size._sum.fileSize ?? 0,
    platform: platforms[0]?.provider ?? '—',
  };
}
