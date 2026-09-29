import { demoMedia, examples } from './demo';
import { inspectRemoteMedia } from '@/lib/remote-media';
import type { MediaProvider } from './types';
export const generic: MediaProvider = {
  name: 'Generic',
  validate: () => true,
  analyze: async (url) => {
    if (examples.some((example) => example.url === url.href)) return demoMedia(url, 'Generic');
    const media = await inspectRemoteMedia(url);
    return {
      url: media.finalUrl,
      provider: 'Generic',
      title: media.title,
      author: new URL(media.finalUrl).hostname,
      duration: null,
      thumbnail:
        media.mediaType === 'audio'
          ? 'audio'
          : media.mediaType === 'image'
            ? 'mountains'
            : 'landscape',
      formats: [
        {
          id: 'source',
          label: media.extension.toUpperCase(),
          extension: media.extension,
          quality: 'Original',
          mediaType: media.mediaType,
          fileSize: media.size,
          mimeType: media.mimeType,
        },
      ],
      demo: false,
    };
  },
};
