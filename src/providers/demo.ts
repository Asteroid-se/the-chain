import type { Media, MediaFormat, ProviderName } from '@/types/media';
export const examples = [
  {
    label: 'Cinematic video',
    url: 'https://www.youtube.com/watch?v=chain-demo',
    type: 'video',
    title: 'Somewhere, beyond the ordinary',
    caption: 'A little perspective. A lot of possibility.',
    art: 'landscape',
  },
  {
    label: 'Ambient audio',
    url: 'https://media.example.com/late-night.wav',
    type: 'audio',
    title: 'Late nights, quiet minds',
    caption: 'Find your frequency. Stay in the flow.',
    art: 'audio',
  },
  {
    label: 'Photography',
    url: 'https://www.instagram.com/p/chain-demo/',
    type: 'image',
    title: 'A moment in the mountains',
    caption: 'The places you want to keep.',
    art: 'mountains',
  },
  {
    label: 'Test retry',
    url: 'https://www.tiktok.com/@demo/video/fail',
    type: 'video',
    title: 'Motion in the everyday',
    caption: 'A demo that fails once. Give it another go.',
    art: 'motion',
  },
] as const;
const video: MediaFormat[] = [1080, 720, 480].map((quality, index) => ({
  id: `mp4-${quality}`,
  label: 'MP4',
  extension: 'mp4',
  quality: `${quality}p`,
  mediaType: 'video',
  fileSize: [48234496, 25165824, 12582912][index],
}));
const audio: MediaFormat[] = [
  {
    id: 'mp3',
    label: 'MP3',
    extension: 'mp3',
    quality: '320 kbps',
    mediaType: 'audio',
    fileSize: 7340032,
  },
  {
    id: 'm4a',
    label: 'M4A',
    extension: 'm4a',
    quality: '256 kbps',
    mediaType: 'audio',
    fileSize: 5242880,
  },
];
const images: MediaFormat[] = [
  {
    id: 'jpg',
    label: 'JPG',
    extension: 'jpg',
    quality: 'Original',
    mediaType: 'image',
    fileSize: 3145728,
  },
  {
    id: 'png',
    label: 'PNG',
    extension: 'png',
    quality: 'Original',
    mediaType: 'image',
    fileSize: 6291456,
  },
];
export function demoMedia(url: URL, provider: ProviderName): Media {
  const type =
    provider === 'Instagram' || /\.(jpg|jpeg|png|webp)$/i.test(url.pathname)
      ? 'image'
      : /\.(mp3|m4a|wav|ogg)$/i.test(url.pathname)
        ? 'audio'
        : 'video';
  const example =
    examples.find((item) => item.url === url.href) ?? examples.find((item) => item.type === type)!;
  return {
    url: url.href,
    provider,
    title: example.title,
    author: 'The Chain Studio · Demo media',
    duration: type === 'image' ? null : type === 'audio' ? '3:42' : '2:34',
    thumbnail: example.art,
    formats: type === 'image' ? images : type === 'audio' ? audio : [...video, ...audio],
    demo: true,
  };
}
