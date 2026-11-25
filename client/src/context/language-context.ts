import { createContext } from 'react';

import type { SupportedLanguage } from '@/i18n/languages';

export interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  isTranslating: boolean;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
