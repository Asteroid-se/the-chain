import { demoMedia } from './demo';
import type { MediaProvider } from './types';
export const generic: MediaProvider = {
  name: 'Generic',
  validate: () => true,
  analyze: async (url) => demoMedia(url, 'Generic'),
};
