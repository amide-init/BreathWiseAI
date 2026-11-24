import { env } from '@/config/env';
import { getFirebaseAuth } from '@/lib/firebase';
import type { ApiErrorEnvelope } from '@/types';

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId?: string;

  constructor(message: string, status: number, code = 'API_ERROR', requestId?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  requireAuth?: boolean;
  signal?: AbortSignal;
}

/**
 * Reusable authenticated HTTP client for Cloud Functions Gen 2 endpoints.
 * Automatically attaches the current Firebase Auth user's ID token when required.
 */
export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { method = 'GET', body, requireAuth = true, signal } = options;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (requireAuth) {
    const auth = getFirebaseAuth();
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      throw new ApiClientError('Please sign in to continue.', 401, 'UNAUTHENTICATED');
    }
    const idToken = await currentUser.getIdToken();
    headers.Authorization = `Bearer ${idToken}`;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${env.apiBaseUrl}${normalizedPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    let parsedError: ApiErrorEnvelope | null = null;
    try {
      parsedError = (await response.json()) as ApiErrorEnvelope;
    } catch {
      parsedError = null;
    }

    throw new ApiClientError(
      parsedError?.error?.message ?? `Request failed with status ${response.status}.`,
      response.status,
      parsedError?.error?.code ?? 'HTTP_ERROR',
      parsedError?.error?.requestId,
    );
  }

  return (await response.json()) as TResponse;
}
