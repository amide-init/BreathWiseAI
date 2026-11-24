import { useCallback, useEffect, useState } from 'react';

import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { fetchAirQuality } from '@/services/air-quality.service';
import type { AirQualityResponse } from '@/types';

export interface UseAirQualityResult {
  data: AirQualityResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: (force?: boolean) => void;
}

export function useAirQuality(): UseAirQualityResult {
  const { selectedLocation } = useSelectedLocation();
  const [data, setData] = useState<AirQualityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [forceNext, setForceNext] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const firstLoad = data === null || data.locationId !== selectedLocation.locationId;
    if (firstLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    fetchAirQuality(selectedLocation, {
      forceRefresh: forceNext,
      signal: controller.signal,
    })
      .then((response) => {
        setData(response);
        setForceNext(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to reach the BreatheWise environmental API.';
        setError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation.locationId, reloadTick]);

  const refresh = useCallback((force = false) => {
    setForceNext(force);
    setReloadTick((tick) => tick + 1);
  }, []);

  return { data, isLoading, isRefreshing, error, refresh };
}
