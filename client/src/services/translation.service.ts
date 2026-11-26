import { callFunction } from '@/lib/callable-client';
import type { SupportedLanguage } from '@/i18n/languages';

interface TranslateTextsRequest {
  language: SupportedLanguage;
  texts: string[];
}

export interface TranslateTextsResult {
  translations: string[];
  fallbackUsed: boolean;
}

interface TranslateTextsWireResponse {
  language: string;
  translations: string[];
  fallbackUsed?: boolean;
  fallback_used?: boolean;
}

/**
 * Calls the bounded `translate_texts` Firebase Cloud Function callable to
 * batch-translate uncached English UI & Firestore view strings in real time.
 * Firestore documents remain stored in English — only the rendered view changes.
 */
export async function translateTextsBatch(
  language: SupportedLanguage,
  texts: string[],
): Promise<TranslateTextsResult> {
  if (language === 'en' || texts.length === 0) {
    return { translations: texts, fallbackUsed: false };
  }

  const response = await callFunction<TranslateTextsRequest, TranslateTextsWireResponse>(
    'translate_texts',
    {
      language,
      texts,
    },
  );

  const fallbackUsed = Boolean(response.fallbackUsed ?? response.fallback_used);
  if (!Array.isArray(response.translations) || response.translations.length !== texts.length) {
    return { translations: texts, fallbackUsed: true };
  }
  return {
    translations: response.translations,
    fallbackUsed,
  };
}
