import { endpoint, ok } from '@/lib/api';
import { getStats } from '@/services/downloads';
export async function GET() {
  return endpoint(async () => ok(await getStats()));
}
