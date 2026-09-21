import { demoMedia } from './demo';
import { detectProvider } from '@/lib/url';
import type { MediaProvider } from './types';
export const instagram: MediaProvider = {
  name: 'Instagram',
  validate: (url) => detectProvider(url.href) === 'Instagram',
  analyze: async (url) => demoMedia(url, 'Instagram'),
};
