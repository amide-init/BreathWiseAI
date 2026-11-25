import { collection, doc, limit, orderBy, query } from 'firebase/firestore';

import { callFunction } from '@/lib/callable-client';
import { applyAirQualityFreshness, dedupeFetch } from '@/lib/client-cache';
import { getFirebaseDb } from '@/lib/firebase';
import { getDocFromLocalCache, getDocsFromLocalCache } from '@/lib/firestore-cache';
import type {
  AirQualityResponse,
  CurrentAirQuality,
  ForecastPoint,
  LocationOption,
  WeatherSnapshot,
} from '@/types';

interface LocationSearchResponse {
  results: LocationOption[];
}

interface GetAirQualityPayload {
  locationId: string;
  lat: number;
  lng: number;
  label: string;
  forceRefresh?: boolean;
}

export async function searchLocations(queryText: string): Promise<LocationOption[]> {
  const data = await callFunction<{ q: string }, LocationSearchResponse>('search_locations', {
    q: queryText,
  });
  return data.results ?? [];
}

/**
 * Reads shared `air_quality/{locationId}` + `forecasts/` strictly from Firestore's
 * local IndexedDB cache for instant paint, enforcing the 30-minute staleness guardrail.
 */
export async function readCachedAirQualityFromFirestore(
  location: LocationOption,
): Promise<AirQualityResponse | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }

  try {
    const docRef = doc(db, 'air_quality', location.locationId);
    const snap = await getDocFromLocalCache(docRef);
    if (!snap || !snap.exists()) {
      return null;
    }

    const raw = snap.data();
    if (!raw.current || !raw.weather) {
      return null;
    }

    const forecastsQuery = query(
      collection(db, 'air_quality', location.locationId, 'forecasts'),
      orderBy('forecastFor', 'asc'),
      limit(24),
    );
    const forecastSnaps = await getDocsFromLocalCache(forecastsQuery);
    const forecasts: ForecastPoint[] = forecastSnaps
      ? forecastSnaps.docs.map((d) => d.data() as ForecastPoint)
      : [];

    const assembled: AirQualityResponse = {
      locationId: location.locationId,
      locationName: typeof raw.locationName === 'string' ? raw.locationName : location.label,
      current: raw.current as CurrentAirQuality,
      weather: raw.weather as WeatherSnapshot,
      forecasts,
      fallbackProviderUsed: Boolean(raw.fallbackProviderUsed),
    };

    const fetchedAtIso = typeof raw.fetchedAt === 'string' ? raw.fetchedAt : null;
    return applyAirQualityFreshness(assembled, Date.now(), fetchedAtIso);
  } catch {
    return null;
  }
}

export function fetchAirQuality(
  location: LocationOption,
  options?: { forceRefresh?: boolean },
): Promise<AirQualityResponse> {
  const force = Boolean(options?.forceRefresh);
  const dedupeKey = `fetch:aqi:${location.locationId}:${force ? 'force' : 'normal'}`;

  return dedupeFetch(dedupeKey, () =>
    callFunction<GetAirQualityPayload, AirQualityResponse>('get_air_quality', {
      locationId: location.locationId,
      lat: location.lat,
      lng: location.lng,
      label: location.label,
      forceRefresh: force,
    }),
  );
}
