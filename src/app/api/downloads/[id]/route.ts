import { z } from 'zod';
import { endpoint, ok, ApiError } from '@/lib/api';
import { db } from '@/lib/db';
import { changeJob } from '@/services/queue';
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return endpoint(async () => {
    const { id } = await context.params;
    const { action } = z
      .object({ action: z.enum(['pause', 'resume', 'retry']) })
      .parse(await request.json());
    return ok(await changeJob(id, action));
  });
}
export async function DELETE(_request: Request, context: Context) {
  return endpoint(async () => {
    const { id } = await context.params;
    const result = await db.download.deleteMany({ where: { id } });
    if (!result.count) throw new ApiError('Download not found.', 404);
    return ok({ id });
  });
}
