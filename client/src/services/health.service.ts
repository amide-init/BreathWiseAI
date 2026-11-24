import { apiRequest } from '@/lib/api-client';
import type { HealthCheckResponse } from '@/types';

export function fetchBackendHealth(): Promise<HealthCheckResponse> {
  return apiRequest<HealthCheckResponse>('/v1/health', { requireAuth: false });
}
