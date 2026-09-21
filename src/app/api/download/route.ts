import { z } from 'zod';
import { endpoint, ok } from '@/lib/api';
import { urlSchema } from '@/lib/url';
import { enqueue } from '@/services/queue';
export async function POST(request: Request) {
  return endpoint(async () => {
    const body = z
      .object({ url: urlSchema, formatId: z.string().min(1).max(40) })
      .parse(await request.json());
    return ok(await enqueue(body.url, body.formatId), 201);
  });
}
