import { callFunction } from '@/lib/callable-client';
import type { SupportedLanguage } from '@/i18n/languages';

interface TranslateTextsRequest {
  language: SupportedLanguage;
  texts: string[];
}

interface TranslateTextsResponse {
  language: string;
  translations: string[];
  fallbackUsed?: boolean;
}

/**
 * Calls the bounded `translate_texts` Firebase Cloud Function callable to
 * batch-translate uncached English UI & AI strings into Indian-English varieties.
 */
export async function translateTextsBatch(
  language: SupportedLanguage,
  texts: string[],
): Promise<string[]> {
  if (language === 'en' || texts.length === 0) {
    return texts;
  }

  const response = await callFunction<TranslateTextsRequest, TranslateTextsResponse>(
    'translate_texts',
    {
      language,
      texts,
    },
  );

  if (!Array.isArray(response.translations) || response.translations.length !== texts.length) {
    return texts;
  }
  return response.translations;
}
