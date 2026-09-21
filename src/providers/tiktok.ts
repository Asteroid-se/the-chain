import { demoMedia } from './demo';
import { detectProvider } from '@/lib/url';
import type { MediaProvider } from './types';
export const tiktok: MediaProvider = {
  name: 'TikTok',
  validate: (url) => detectProvider(url.href) === 'TikTok',
  analyze: async (url) => demoMedia(url, 'TikTok'),
};
