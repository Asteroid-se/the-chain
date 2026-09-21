import { youtube } from './youtube';
import { instagram } from './instagram';
import { tiktok } from './tiktok';
import { generic } from './generic';
import { urlSchema } from '@/lib/url';
export async function analyzeMedia(value: string) {
  const url = new URL(urlSchema.parse(value));
  const provider = [youtube, instagram, tiktok, generic].find((adapter) => adapter.validate(url))!;
  return provider.analyze(url);
}
