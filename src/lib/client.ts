export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new Error('Unable to reach The Chain. Check your connection and try again.');
  }
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error(result.error || 'The request could not be completed.');
  return result.data as T;
}
export function bytes(value: number) {
  if (!value) return '0 B';
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${['B', 'KB', 'MB', 'GB'][index]}`;
}
