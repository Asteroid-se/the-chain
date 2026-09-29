import { db } from '@/lib/db';
import { ApiError } from '@/lib/api';
import { analyzeMedia } from '@/providers';
// Elapsed-time reconciliation is a demo worker. State lives in SQLite, not browser timers.
export async function reconcileQueue() {
  return db.$transaction(async (tx) => {
    const job = await tx.download.findFirst({
      where: { status: { in: ['queued', 'processing'] } },
      orderBy: { createdAt: 'asc' },
    });
    if (!job || job.paused) return;
    if (job.real) return;
    if (job.status === 'queued') {
      await tx.download.update({
        where: { id: job.id },
        data: { status: 'processing', updatedAt: new Date() },
      });
      return;
    }
    const now = new Date();
    const ticks = Math.floor((now.getTime() - job.updatedAt.getTime()) / 250);
    if (ticks < 1) return;
    const progress = Math.min(100, job.progress + ticks * 2);
    const failed = job.url.includes('/fail') && job.attempts === 0 && progress >= 42;
    await tx.download.update({
      where: { id: job.id },
      data: {
        updatedAt: now,
        progress: failed ? 42 : progress,
        status: failed ? 'failed' : progress === 100 ? 'completed' : 'processing',
        completedAt: !failed && progress === 100 ? now : null,
        error: failed ? 'Simulated connection interrupted. Retry to complete this demo.' : null,
      },
    });
  });
}
export async function enqueue(url: string, formatId: string) {
  const media = await analyzeMedia(url);
  const format = media.formats.find((item) => item.id === formatId);
  if (!format) throw new ApiError('That format is not available for this media.');
  return db.download.create({
    data: {
      url: media.url,
      provider: media.provider,
      title: media.title,
      thumbnail: media.thumbnail,
      format: format.extension,
      quality: format.quality,
      mediaType: format.mediaType,
      fileSize: format.fileSize,
      sourceUrl: media.demo ? null : media.url,
      sourceFormat: media.demo ? null : format.id,
      mimeType: media.demo ? null : (format.mimeType ?? 'application/octet-stream'),
      real: !media.demo,
    },
  });
}
export async function changeJob(id: string, action: 'pause' | 'resume' | 'retry') {
  await reconcileQueue();
  return db.$transaction(async (tx) => {
    const job = await tx.download.findUnique({ where: { id } });
    if (!job) throw new ApiError('Download not found.', 404);
    if (action === 'retry') {
      if (job.status !== 'failed') throw new ApiError('Only failed downloads can be retried.', 409);
      return tx.download.update({
        where: { id },
        data: {
          status: 'queued',
          progress: 0,
          paused: false,
          error: null,
          attempts: { increment: 1 },
        },
      });
    }
    if (!['queued', 'processing'].includes(job.status))
      throw new ApiError('This download is no longer active.', 409);
    return tx.download.update({
      where: { id },
      data: {
        paused: action === 'pause',
        ...(action === 'resume' ? { status: 'queued' } : {}),
      },
    });
  });
}
