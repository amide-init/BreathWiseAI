import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyAirQualityFreshness,
  clearAllCaches,
  dedupeFetch,
  getCached,
  invalidateByPrefix,
  setCached,
} from '@/lib/client-cache';
import type { AirQualityResponse } from '@/types';

function makeSampleAqi(observedAt: string): AirQualityResponse {
  return {
    locationId: 'in-new-delhi-28.61-77.21',
    locationName: 'New Delhi, Delhi, India',
    current: {
      aqi: 245,
      aqiScale: 'CPCB_NAQI',
      category: 'Poor',
      dominantPollutant: 'pm25',
      healthGuidance: 'Reduce prolonged outdoor exertion.',
      readings: [
        {
          location: 'New Delhi',
          pollutant: 'PM2.5',
          value: 112,
          unit: 'µg/m³',
          observedAt,
          source: 'WAQI',
          freshnessStatus: 'fresh',
        },
      ],
      observedAt,
      source: 'WAQI',
      freshnessStatus: 'fresh',
    },
    weather: {
      tempC: 21,
      humidityPct: 58,
      windSpeedKmh: 7.5,
      windDirectionDeg: 290,
      observedAt,
      source: 'Open-Meteo',
      freshnessStatus: 'fresh',
    },
    forecasts: [],
    fallbackProviderUsed: false,
  };
}

afterEach(() => {
  clearAllCaches();
});

describe('client-cache SWR utilities', () => {
  it('stores, expires by TTL, invalidates by prefix, and wipes cleanly on clearAllCaches', () => {
    setCached('family:uid_1', { id: 'f1' }, 1000, 10_000);
    setCached('family:uid_2', { id: 'f2' }, 1000, 10_000);
    setCached('aqi:delhi', { aqi: 180 }, 1000, 10_000);

    expect(getCached('family:uid_1', 10_500)?.isFresh).toBe(true);
    expect(getCached('family:uid_1', 11_500)?.isFresh).toBe(false);

    invalidateByPrefix('family:');
    expect(getCached('family:uid_1')).toBeNull();
    expect(getCached('aqi:delhi')).not.toBeNull();

    clearAllCaches();
    expect(getCached('aqi:delhi')).toBeNull();
  });

  it('deduplicates concurrent in-flight requests for the same key', async () => {
    const fetcher = vi.fn(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 10)),
    );

    const [a, b, c] = await Promise.all([
      dedupeFetch('shared:key', fetcher),
      dedupeFetch('shared:key', fetcher),
      dedupeFetch('shared:key', fetcher),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect([a, b, c]).toEqual(['ok', 'ok', 'ok']);
  });

  it('downgrades cached AQI readings older than 30 minutes to stale (PRD §9 honesty)', () => {
    const nowMs = Date.parse('2026-11-25T15:00:00Z');
    const freshAqi = makeSampleAqi('2026-11-25T14:45:00Z'); // 15 min old
    const oldAqi = makeSampleAqi('2026-11-25T14:10:00Z'); // 50 min old

    expect(applyAirQualityFreshness(freshAqi, nowMs).current.freshnessStatus).toBe('fresh');

    const downgraded = applyAirQualityFreshness(oldAqi, nowMs);
    expect(downgraded.current.freshnessStatus).toBe('stale');
    expect(downgraded.current.readings[0]?.freshnessStatus).toBe('stale');
    expect(downgraded.weather.freshnessStatus).toBe('stale');
  });
});
