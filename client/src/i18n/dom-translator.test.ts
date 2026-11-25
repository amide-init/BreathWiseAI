import { describe, expect, it } from 'vitest';

import { numbersPreserved, shouldSkipText } from '@/i18n/dom-translator';
import { INSTANT_GLOSSARY } from '@/i18n/instant-glossary';
import {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  SUPPORTED_LANGUAGES,
} from '@/i18n/languages';

describe('Real-time frontend translator safety & glossary', () => {
  it('supports English default plus 5 Indian languages with English technical terms', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(['en', 'hi', 'bn', 'mr', 'ta', 'te']);
    expect(isSupportedLanguage('hi')).toBe(true);
    expect(isSupportedLanguage('bn')).toBe(true);
    expect(isSupportedLanguage('hi-en')).toBe(false);
  });

  it('provides instant 0ms glossary entries for all 5 Indian languages', () => {
    for (const lang of ['hi', 'bn', 'mr', 'ta', 'te'] as const) {
      expect(INSTANT_GLOSSARY[lang]['Daily Plan']).toBeTruthy();
      expect(INSTANT_GLOSSARY[lang]['Right Now — Everyday Answers']).toBeTruthy();
      expect(INSTANT_GLOSSARY[lang].Severe).toBeTruthy();
    }
  });

  it('skips numbers, pollutant symbols, timestamps, and emails to preserve safety', () => {
    expect(shouldSkipText('142')).toBe(true);
    expect(shouldSkipText('28°C')).toBe(true);
    expect(shouldSkipText('PM2.5')).toBe(true);
    expect(shouldSkipText('AQI')).toBe(true);
    expect(shouldSkipText('10:30 PM')).toBe(true);
    expect(shouldSkipText('user@example.com')).toBe(true);
    expect(shouldSkipText('BreatheWise AI')).toBe(true);

    expect(shouldSkipText('Right Now — Everyday Answers')).toBe(false);
    expect(shouldSkipText('Outdoor air is poor — wear an N95 mask')).toBe(false);
  });

  it('enforces strict numeric preservation while allowing natural SOV clause reordering', () => {
    expect(
      numbersPreserved(
        'AQI is 245 and PM2.5 is 88.5 µg/m³.',
        'आज AQI 245 और PM2.5 88.5 µg/m³ है।',
      ),
    ).toBe(true);

    // Reordered clauses in Hindi SOV grammar preserve exact same numeric multiset -> allowed
    expect(
      numbersPreserved(
        'Turn on exhaust 5 minutes before cooking and keep on for 15 minutes afterward.',
        '15 मिनट बाद तक चलाएं और खाना बनाने से 5 मिनट पहले एग्जॉस्ट चालू करें।',
      ),
    ).toBe(true);

    // Must reject altered AQI figure
    expect(
      numbersPreserved(
        'AQI is 245 — avoid outdoor exercise.',
        'आज AQI 120 है — outdoor exercise से बचें।',
      ),
    ).toBe(false);

    // Must reject fabricated extra number
    expect(
      numbersPreserved('Keep windows closed today.', 'आज 2 घंटे खिड़की बंद रखें।'),
    ).toBe(false);
  });
});
