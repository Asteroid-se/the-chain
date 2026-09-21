import { z } from 'zod';
import type { ProviderName } from '@/types/media';
export const urlSchema = z
  .string()
  .trim()
  .max(2048)
  .url('Enter a complete URL, including https://.')
  .refine((value) => {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Use a public HTTP or HTTPS URL without credentials.');
export function detectProvider(value: string): ProviderName {
  try {
    const host = new URL(value).hostname.toLowerCase();
    const matches = (domain: string) => host === domain || host.endsWith(`.${domain}`);
    if (matches('youtube.com') || matches('youtu.be')) return 'YouTube';
    if (matches('instagram.com')) return 'Instagram';
    if (matches('tiktok.com')) return 'TikTok';
  } catch {
    /* Partial input remains generic until it is a valid URL. */
  }
  return 'Generic';
}
