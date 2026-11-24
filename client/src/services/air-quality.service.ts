import { apiRequest } from '@/lib/api-client';
import type { AirQualityResponse, LocationOption } from '@/types';

interface LocationSearchResponse {
  results: LocationOption[];
}

export async function searchLocations(query: string): Promise<LocationOption[]> {
  const params = new URLSearchParams({ q: query });
  const data = await apiRequest<LocationSearchResponse>(`/v1/locations/search?${params.toString()}`);
  return data.results ?? [];
}

export function fetchAirQuality(
  location: LocationOption,
  options?: { forceRefresh?: boolean; signal?: AbortSignal },
): Promise<AirQualityResponse> {
  const params = new URLSearchParams({
    locationId: location.locationId,
    lat: String(location.lat),
    lng: String(location.lng),
    label: location.label,
  });
  if (options?.forceRefresh) {
    params.set('forceRefresh', 'true');
  }
  return apiRequest<AirQualityResponse>(`/v1/air-quality?${params.toString()}`, {
    signal: options?.signal,
  });
}
