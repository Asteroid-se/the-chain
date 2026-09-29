import { demoMedia, examples } from './demo';
import { detectProvider } from '@/lib/url';
import { analyzeYoutube } from '@/lib/youtube-dlp';
import type { MediaProvider } from './types';
export const youtube: MediaProvider = {
  name: 'YouTube',
  validate: (url) => detectProvider(url.href) === 'YouTube',
  analyze: async (url) =>
    examples.some((example) => example.url === url.href)
      ? demoMedia(url, 'YouTube')
      : analyzeYoutube(url),
};
