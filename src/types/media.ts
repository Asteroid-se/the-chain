export type ProviderName = 'YouTube' | 'Instagram' | 'TikTok' | 'Generic';
export type MediaType = 'video' | 'audio' | 'image';
export interface MediaFormat {
  id: string;
  label: string;
  extension: string;
  quality: string;
  mediaType: MediaType;
  fileSize: number;
  mimeType?: string;
}
export interface Media {
  url: string;
  provider: ProviderName;
  title: string;
  author: string;
  duration: string | null;
  thumbnail: string;
  formats: MediaFormat[];
  demo: boolean;
}
export interface DownloadItem {
  id: string;
  url: string;
  provider: string;
  title: string;
  thumbnail: string;
  format: string;
  quality: string;
  mediaType: string;
  status: string;
  fileSize: number;
  progress: number;
  paused: boolean;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  hasFile: boolean;
}
export interface Stats {
  total: number;
  videos: number;
  audio: number;
  images: number;
  bytes: number;
  platform: string;
}
