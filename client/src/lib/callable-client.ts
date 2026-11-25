import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';

import { getFirebaseFunctions } from '@/lib/firebase';

export class CallableClientError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'FUNCTIONS_ERROR') {
    super(message);
    this.name = 'CallableClientError';
    this.code = code;
  }
}

/**
 * Reusable wrapper around Firebase `httpsCallable` (prioritized over raw HTTP fetch).
 * Automatically sends the signed-in user's Firebase Auth ID token and handles CORS.
 */
export async function callFunction<TRequest, TResponse>(
  functionName: string,
  payload?: TRequest,
): Promise<TResponse> {
  const functions = getFirebaseFunctions();
  if (!functions) {
    throw new CallableClientError(
      'Firebase Functions SDK is not configured.',
      'FUNCTIONS_UNAVAILABLE',
    );
  }

  try {
    const callable = httpsCallable<TRequest | undefined, TResponse>(functions, functionName);
    const result = await callable(payload);
    return result.data;
  } catch (err) {
    if (err instanceof FirebaseError) {
      const cleanMessage = err.message.replace(/^Firebase:\s*/i, '');
      throw new CallableClientError(cleanMessage, err.code);
    }
    throw new CallableClientError(
      err instanceof Error ? err.message : 'Unable to reach BreatheWise backend service.',
      'UNKNOWN_ERROR',
    );
  }
}
