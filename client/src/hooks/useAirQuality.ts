import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import {
  applyAirQualityFreshness,
  AQI_SOFT_REVALIDATE_MS,
  getCached,
  setCached,
} from '@/lib/client-cache';
import {
  fetchAirQuality,
  readCachedAirQualityFromFirestore,
} from '@/services/air-quality.service';
import type { AirQualityResponse } from '@/types';

export interface UseAirQualityResult {
  data: AirQualityResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: (force?: boolean) => void;
}

function getAqiCacheKey(locationId: string): string {
  return `aqi:${locationId}`;
}

export function useAirQuality(): UseAirQualityResult {
  const { user } = useAuth();
  const { selectedLocation } = useSelectedLocation();
  const cacheKey = getAqiCacheKey(selectedLocation.locationId);

  const [data, setData] = useState<AirQualityResponse | null>(() => {
    const cached = getCached<AirQualityResponse>(cacheKey);
    return cached ? applyAirQualityFreshness(cached.value) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => getCached(cacheKey) === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [forceNext, setForceNext] = useState(false);

  useEffect(() => {
    let active = true;
    const key = getAqiCacheKey(selectedLocation.locationId);
    const memHit = getCached<AirQualityResponse>(key);

    async function hydrateAndRevalidate() {
      let hasRenderedData = false;

      // Layer 1: 0ms in-memory SWR cache (tab switches)
      if (memHit) {
        const evaluated = applyAirQualityFreshness(memHit.value);
        setData(evaluated);
        setIsLoading(false);
        setError(null);
        hasRenderedData = true;

        // Skip network call if still soft-fresh (<5 min) and user didn't force refresh
        if (!forceNext && memHit.isFresh && evaluated.current.freshnessStatus === 'fresh') {
          setIsRefreshing(false);
          return;
        }
      } else {
        setData(null);
        setIsLoading(true);
        setError(null);

        // Layer 2: Firestore local IndexedDB cache (~20ms on page reload for signed-in users)
        const localFirestoreHit = user
          ? await readCachedAirQualityFromFirestore(selectedLocation)
          : null;
        if (!active) {
          return;
        }
        if (localFirestoreHit) {
          setData(localFirestoreHit);
          setIsLoading(false);
          hasRenderedData = true;
        }
      }

      // Layer 3: Live revalidation via Cloud Function (silent if cached data is already visible)
      if (hasRenderedData) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const live = await fetchAirQuality(selectedLocation, { forceRefresh: forceNext });
        if (!active) {
          return;
        }
        const evaluatedLive = applyAirQualityFreshness(live);
        setCached(key, evaluatedLive, AQI_SOFT_REVALIDATE_MS);
        setData(evaluatedLive);
        setError(null);
        setForceNext(false);
      } catch (err: unknown) {
        if (!active) {
          return;
        }
        // Keep cached data visible if already rendered (offline/flaky network resilience)
        if (!hasRenderedData) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to reach the BreathWiseAI environmental service.';
          setError(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    }

    void hydrateAndRevalidate();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation.locationId, reloadTick]);

  const refresh = useCallback((force = false) => {
    setForceNext(force);
    setReloadTick((tick) => tick + 1);
  }, []);

  return { data, isLoading, isRefreshing, error, refresh };
}
