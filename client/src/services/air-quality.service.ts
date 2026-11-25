import { callFunction } from '@/lib/callable-client';
import type { AirQualityResponse, LocationOption } from '@/types';

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

export async function searchLocations(query: string): Promise<LocationOption[]> {
  const data = await callFunction<{ q: string }, LocationSearchResponse>('search_locations', {
    q: query,
  });
  return data.results ?? [];
}

export function fetchAirQuality(
  location: LocationOption,
  options?: { forceRefresh?: boolean },
): Promise<AirQualityResponse> {
  return callFunction<GetAirQualityPayload, AirQualityResponse>('get_air_quality', {
    locationId: location.locationId,
    lat: location.lat,
    lng: location.lng,
    label: location.label,
    forceRefresh: Boolean(options?.forceRefresh),
  });
}
