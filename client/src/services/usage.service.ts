import { callFunction } from '@/lib/callable-client';
import { getCached, invalidateCached, setCached } from '@/lib/client-cache';
import type { UserUsageSummary } from '@/models/usage.model';

const USAGE_CACHE_TTL_MS = 15 * 1000;

export async function fetchUserUsage(
  uid: string,
  options?: { forceRefresh?: boolean },
): Promise<UserUsageSummary> {
  const key = `user_usage:${uid}`;
  if (!options?.forceRefresh) {
    const cached = getCached<UserUsageSummary>(key);
    if (cached?.isFresh) {
      return cached.value;
    }
  } else {
    invalidateCached(key);
  }

  const summary = await callFunction<Record<string, never>, UserUsageSummary>('get_user_usage', {});
  setCached(key, summary, USAGE_CACHE_TTL_MS);
  return summary;
}
