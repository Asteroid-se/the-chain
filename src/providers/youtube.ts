import { demoMedia } from './demo';
import { detectProvider } from '@/lib/url';
import type { MediaProvider } from './types';
export const youtube: MediaProvider = {
  name: 'YouTube',
  validate: (url) => detectProvider(url.href) === 'YouTube',
  analyze: async (url) => demoMedia(url, 'YouTube'),
};
