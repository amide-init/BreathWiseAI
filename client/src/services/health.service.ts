import { callFunction } from '@/lib/callable-client';
import type { HealthCheckResponse } from '@/types';

export function fetchBackendHealth(): Promise<HealthCheckResponse> {
  return callFunction<Record<string, never>, HealthCheckResponse>('health_check', {});
}
