import { z } from 'zod';
import { endpoint, ok } from '@/lib/api';
import { urlSchema } from '@/lib/url';
import { analyzeMedia } from '@/providers';
export async function POST(request: Request) {
  return endpoint(async () => {
    const body = z.object({ url: urlSchema }).parse(await request.json());
    return ok(await analyzeMedia(body.url));
  });
}
