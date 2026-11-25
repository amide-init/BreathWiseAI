export type SupportedLanguage = 'en' | 'hi' | 'bn' | 'mr' | 'ta' | 'te';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  shortCode: string;
  nativeHint: string;
  description: string;
  sampleLine: string;
}

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const LANGUAGE_STORAGE_KEY = 'breathewise:lang';

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    shortCode: 'EN',
    nativeHint: 'Default',
    description: 'Clear global English for all screens and AI guidance.',
    sampleLine: 'Outdoor air is moderate — light walks are fine.',
  },
  {
    code: 'hi',
    label: 'हिन्दी',
    shortCode: 'हि',
    nativeHint: 'Hindi + English terms',
    description: 'Natural Hindi with familiar English words like AQI, mask, and indoor.',
    sampleLine: 'आज बाहर की हवा moderate है — हल्की walk ठीक रहेगी।',
  },
  {
    code: 'bn',
    label: 'বাংলা',
    shortCode: 'বা',
    nativeHint: 'Bengali + English terms',
    description: 'Natural Bengali with familiar English words like AQI, mask, and indoor.',
    sampleLine: 'আজ বাইরের হাওয়া moderate — হালকা walk করা ঠিক আছে।',
  },
  {
    code: 'mr',
    label: 'मराठी',
    shortCode: 'म',
    nativeHint: 'Marathi + English terms',
    description: 'Natural Marathi with familiar English words like AQI, mask, and indoor.',
    sampleLine: 'आज बाहेरची हवा moderate आहे — हलका walk चालेल.',
  },
  {
    code: 'ta',
    label: 'தமிழ்',
    shortCode: 'த',
    nativeHint: 'Tamil + English terms',
    description: 'Natural Tamil with familiar English words like AQI, mask, and indoor.',
    sampleLine: 'இன்று வெளியே காற்று moderate ஆக உள்ளது — light walk செய்யலாம்.',
  },
  {
    code: 'te',
    label: 'తెలుగు',
    shortCode: 'తె',
    nativeHint: 'Telugu + English terms',
    description: 'Natural Telugu with familiar English words like AQI, mask, and indoor.',
    sampleLine: 'ఈరోజు బయట గాలి moderate గా ఉంది — light walk చేయవచ్చు.',
  },
] as const;

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  if (!value) {
    return false;
  }
  return SUPPORTED_LANGUAGES.some((item) => item.code === value);
}

export function getLanguageOption(code: SupportedLanguage): LanguageOption {
  return SUPPORTED_LANGUAGES.find((item) => item.code === code) ?? SUPPORTED_LANGUAGES[0];
}
