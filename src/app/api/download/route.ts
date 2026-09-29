import { z } from 'zod';
import { endpoint, ok } from '@/lib/api';
import { urlSchema } from '@/lib/url';
import { enqueue } from '@/services/queue';
import { runRealDownload } from '@/services/media-files';
import { after } from 'next/server';
export async function POST(request: Request) {
  return endpoint(async () => {
    const body = z
      .object({ url: urlSchema, formatId: z.string().min(1).max(40) })
      .parse(await request.json());
    const job = await enqueue(body.url, body.formatId);
    if (job.real) after(() => runRealDownload(job.id));
    return ok(job, 201);
  });
}
