import { getGenerativeModel, type Schema } from 'firebase/ai';

import { env } from '@/config/env';
import { getFirebaseAI } from '@/lib/firebase';

export interface ClientStructuredJsonOptions {
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  timeoutMs?: number;
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Invokes Firebase AI Logic (`firebase/ai` · Gemini Developer API) directly from
 * the browser for lightweight form-filling helpers using strict JSON Schema output.
 *
 * Returns `null` cleanly on timeout, unprovisioned AI Logic, or offline failures so
 * callers can fall back seamlessly to Cloud Functions or deterministic parsers.
 */
export async function generateStructuredClientJson<T>({
  systemInstruction,
  prompt,
  responseSchema,
  timeoutMs = 10_000,
  maxOutputTokens = 1024,
  temperature = 0.15,
}: ClientStructuredJsonOptions): Promise<T | null> {
  const ai = getFirebaseAI();
  if (!ai) {
    return null;
  }

  let timerId: ReturnType<typeof setTimeout> | null = null;
  try {
    const model = getGenerativeModel(ai, {
      model: env.aiLogicModel,
      systemInstruction,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature,
        maxOutputTokens,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error('Firebase AI Logic request timed out.'));
      }, timeoutMs);
    });

    const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
    const rawText = result.response.text();
    if (!rawText) {
      return null;
    }

    return JSON.parse(rawText) as T;
  } catch {
    return null;
  } finally {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
  }
}
