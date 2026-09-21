'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import type { DownloadItem, Stats } from '@/types/media';
export function useDownloads(
  scope: 'queue' | 'history',
  search = '',
  provider = 'all',
  type = 'all',
) {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const params = new URLSearchParams({ scope, search, provider, type });
      const [list, numbers] = await Promise.all([
        api<DownloadItem[]>(`/api/downloads?${params}`),
        api<Stats>('/api/stats'),
      ]);
      if (current !== generation.current) return;
      setItems(list);
      setStats(numbers);
      setError('');
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : 'Unable to load downloads.');
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [scope, search, provider, type]);
  useEffect(() => {
    const requestGeneration = generation;
    const initial = setTimeout(refresh, 0);
    const interval = setInterval(refresh, 1500);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      requestGeneration.current++;
    };
  }, [refresh]);
  return { items, stats, loading, error, refresh };
}
