import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { LanguageContext, type LanguageContextValue } from '@/context/language-context';
import { RealTimeDomTranslator } from '@/i18n/dom-translator';
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  LANGUAGE_STORAGE_KEY,
  type SupportedLanguage,
} from '@/i18n/languages';
import { translateTextsBatch } from '@/services/translation.service';

function readInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage read failures in restricted browsers.
  }
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(readInitialLanguage);
  const [isTranslating, setIsTranslating] = useState(false);
  const translatorRef = useRef<RealTimeDomTranslator | null>(null);

  const setLanguage = useCallback((next: SupportedLanguage) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Ignore storage write failures.
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.body;
    const translator = new RealTimeDomTranslator({
      root,
      translateBatch: translateTextsBatch,
      onStatusChange: (busy) => setIsTranslating(busy),
    });
    translatorRef.current = translator;

    return () => {
      translator.destroy();
      translatorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'en' ? 'en' : `${language}-IN`;
    }
    translatorRef.current?.setLanguage(language);
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      isTranslating,
    }),
    [language, setLanguage, isTranslating],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
