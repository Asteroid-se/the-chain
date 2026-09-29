import { z } from 'zod';
import { endpoint, ok, ApiError } from '@/lib/api';
import { db } from '@/lib/db';
import { changeJob } from '@/services/queue';
import { removeStoredFile, runRealDownload } from '@/services/media-files';
import { after } from 'next/server';
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    const { id } = await context.params;
    const { action } = z
      .object({ action: z.enum(['pause', 'resume', 'retry']) })
      .parse(await request.json());
    const job = await changeJob(id, action);
    if (job.real && (action === 'resume' || action === 'retry')) after(() => runRealDownload(id));
    return ok(job);
  });
}
export async function DELETE(_request: Request, context: Context) {
  return endpoint(async () => {
    const { id } = await context.params;
    const job = await db.download.findUnique({ where: { id } });
    if (!job) throw new ApiError('Download not found.', 404);
    await db.download.delete({ where: { id } });
    await removeStoredFile(job.filePath);
    return ok({ id });
  });
}
