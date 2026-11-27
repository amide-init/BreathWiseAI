import type { AirQualityResponse } from '@/types';

interface CacheEntry<T> {
  value: T;
  storedAt: number;
  ttlMs: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();
const SESSION_CACHE_PREFIX = 'breathewise:sc:';
const LOCAL_CACHE_PREFIX = 'breathewise:lc:';

export const AQI_FRESHNESS_MAX_AGE_MS = 30 * 60 * 1000; // 30 min CPCB freshness SLA
export const AQI_SOFT_REVALIDATE_MS = 5 * 60 * 1000; // Silently revalidate after 5 min

export function getLocalCached<T>(key: string, now = Date.now()): T | null {
  const mem = getCached<T>(key, now);
  if (mem && mem.isFresh) {
    return mem.value;
  }
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem(`${LOCAL_CACHE_PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (now - parsed.storedAt > parsed.ttlMs) {
      localStorage.removeItem(`${LOCAL_CACHE_PREFIX}${key}`);
      return null;
    }
    setCached(key, parsed.value, parsed.ttlMs - (now - parsed.storedAt), now);
    return parsed.value;
  } catch {
    return null;
  }
}

export function setLocalCached<T>(key: string, value: T, ttlMs: number, now = Date.now()): void {
  setCached(key, value, ttlMs, now);
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const entry: CacheEntry<T> = { value, storedAt: now, ttlMs };
    localStorage.setItem(`${LOCAL_CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function getSessionCached<T>(key: string, now = Date.now()): T | null {
  const mem = getCached<T>(key, now);
  if (mem && mem.isFresh) {
    return mem.value;
  }
  try {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (now - parsed.storedAt > parsed.ttlMs) {
      sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${key}`);
      return null;
    }
    setCached(key, parsed.value, parsed.ttlMs - (now - parsed.storedAt), now);
    return parsed.value;
  } catch {
    return null;
  }
}

export function setSessionCached<T>(
  key: string,
  value: T,
  ttlMs: number,
  now = Date.now(),
): void {
  setCached(key, value, ttlMs, now);
  try {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    const entry: CacheEntry<T> = { value, storedAt: now, ttlMs };
    sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function getCached<T>(
  key: string,
  now = Date.now(),
): { value: T; isFresh: boolean; ageMs: number } | null {
  const entry = memoryStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }
  const ageMs = Math.max(0, now - entry.storedAt);
  return {
    value: entry.value,
    isFresh: ageMs <= entry.ttlMs,
    ageMs,
  };
}

export function setCached<T>(key: string, value: T, ttlMs: number, now = Date.now()): void {
  memoryStore.set(key, {
    value,
    storedAt: now,
    ttlMs,
  });
}

export function invalidateCached(key: string): void {
  memoryStore.delete(key);
}

export function invalidateByPrefix(prefix: string): void {
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Wipes all in-memory user & environmental caches (called strictly on Sign Out / UID switch).
 */
export function clearAllCaches(): void {
  memoryStore.clear();
  inflightRequests.clear();
  try {
    if (typeof sessionStorage !== 'undefined') {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(SESSION_CACHE_PREFIX)) {
          sessionStorage.removeItem(k);
        }
      }
    }
    if (typeof localStorage !== 'undefined') {
      for (let i = localStorage.length - 1; i >= 0; i -= 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCAL_CACHE_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
    }
  } catch {
    // Ignore storage access errors
  }
}

/**
 * Coalesces simultaneous identical async calls so multiple mounted hooks share one request.
 */
export function dedupeFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }
  const promise = fetcher().finally(() => {
    inflightRequests.delete(key);
  });
  inflightRequests.set(key, promise);
  return promise;
}

/**
 * Enforces strict PRD §9 freshness honesty on cached AQI payloads:
 * if `observedAt` (or cache timestamp) is older than 30 minutes, downgrades `fresh` -> `stale`
 * so cached readings are NEVER presented as live.
 */
export function applyAirQualityFreshness(
  response: AirQualityResponse,
  nowMs = Date.now(),
  fetchedAtIso?: string | null,
): AirQualityResponse {
  if (response.current.freshnessStatus === 'unavailable' || response.current.aqi === null) {
    return response;
  }

  const timestampStr = fetchedAtIso ?? response.current.observedAt;
  if (!timestampStr) {
    return response;
  }

  const parsedMs = Date.parse(timestampStr);
  if (Number.isNaN(parsedMs)) {
    return response;
  }

  const ageMs = nowMs - parsedMs;
  if (ageMs <= AQI_FRESHNESS_MAX_AGE_MS) {
    return response;
  }

  return {
    ...response,
    current: {
      ...response.current,
      freshnessStatus: 'stale',
      readings: response.current.readings.map((r) => ({
        ...r,
        freshnessStatus: r.value !== null ? 'stale' : 'unavailable',
      })),
    },
    weather: {
      ...response.weather,
      freshnessStatus: response.weather.tempC !== null ? 'stale' : 'unavailable',
    },
  };
}
