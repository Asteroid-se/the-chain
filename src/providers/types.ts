import type { Media, ProviderName } from '@/types/media';
export interface MediaProvider {
  name: ProviderName;
  validate(url: URL): boolean;
  analyze(url: URL): Promise<Media>;
}
