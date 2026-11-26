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
    description: 'Clear English for all screens and AI guidance.',
    sampleLine: 'Outdoor air is moderate — light walks are fine.',
  },
  {
    code: 'hi',
    label: 'हिन्दी',
    shortCode: 'हि',
    nativeHint: 'Hindi',
    description: 'पूर्ण और सरल हिन्दी अनुवाद (AQI और PM2.5 जैसे मानक चिन्ह सुरक्षित)।',
    sampleLine: 'आज बाहर की हवा मध्यम है — हल्की सैर ठीक रहेगी।',
  },
  {
    code: 'bn',
    label: 'বাংলা',
    shortCode: 'বা',
    nativeHint: 'Bengali',
    description: 'সম্পূর্ণ ও সহজ বাংলা অনুবাদ (AQI ও PM2.5 প্রতীক অপরিবর্তিত)।',
    sampleLine: 'আজ বাইরের বাতাস মাঝারি — হালকা হাঁটাচলা নিরাপদ।',
  },
  {
    code: 'mr',
    label: 'मराठी',
    shortCode: 'म',
    nativeHint: 'Marathi',
    description: 'संपूर्ण आणि सोपे मराठी भाषांतर (AQI व PM2.5 चिन्हे कायम).',
    sampleLine: 'आज बाहेरची हवा मध्यम आहे — हलके चालणे सुरक्षित आहे.',
  },
  {
    code: 'ta',
    label: 'தமிழ்',
    shortCode: 'த',
    nativeHint: 'Tamil',
    description: 'முழுமையான மற்றும் எளிய தமிழ் மொழிபெயர்ப்பு (AQI, PM2.5 குறியீடுகள் பாதுகாப்பானவை).',
    sampleLine: 'இன்று வெளியே காற்று மிதமாக உள்ளது — லேசான நடைப்பயிற்சி சிறந்தது.',
  },
  {
    code: 'te',
    label: 'తెలుగు',
    shortCode: 'తె',
    nativeHint: 'Telugu',
    description: 'పూర్తి మరియు సులభమైన తెలుగు అనువాదం (AQI, PM2.5 గుర్తులు మారవు).',
    sampleLine: 'ఈరోజు బయట గాలి మధ్యస్థంగా ఉంది — తేలికపాటి నడక సురక్షితం.',
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
