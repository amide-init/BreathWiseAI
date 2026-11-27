import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase-ai', () => ({
  generateStructuredClientJson: vi.fn(),
}));

import { generateStructuredClientJson } from '@/lib/firebase-ai';
import { DEFAULT_INDOOR_QUESTIONNAIRE } from '@/models/indoor.model';
import {
  parseIndoorAnswersLocally,
  parseIndoorQuestionnaireDescription,
} from '@/services/indoor-ai.service';

describe('indoor-ai.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts all 7 home air habits locally without inventing sensor readings', () => {
    const parsed = parseIndoorAnswersLocally(
      'LPG gas without chimney, dry broom sweeping, daily dhoop, balcony smoking, loose windows, no HEPA purifier',
      DEFAULT_INDOOR_QUESTIONNAIRE,
    );

    expect(parsed).toEqual({
      cookingFuel: 'lpg_gas',
      usesKitchenExhaust: false,
      hasHepaPurifier: false,
      indoorSmokingPresent: true,
      incenseOrDhoopDaily: true,
      dustCleaningMethod: 'dry_broom',
      windowSealingQuality: 'poor',
    });
  });

  it('uses Firebase AI Logic structured output when available and coerces invalid enums', async () => {
    vi.mocked(generateStructuredClientJson).mockResolvedValueOnce({
      cookingFuel: 'electric_induction',
      usesKitchenExhaust: true,
      hasHepaPurifier: true,
      indoorSmokingPresent: false,
      incenseOrDhoopDaily: false,
      dustCleaningMethod: 'hepa_vacuum',
      windowSealingQuality: 'good',
    });

    const result = await parseIndoorQuestionnaireDescription(
      'Induction stove, HEPA purifier and HEPA vacuum, well sealed windows',
      DEFAULT_INDOOR_QUESTIONNAIRE,
    );
    expect(result.fallbackUsed).toBe(false);
    expect(result.answers.cookingFuel).toBe('electric_induction');
    expect(result.answers.hasHepaPurifier).toBe(true);
    expect(result.answers.windowSealingQuality).toBe('good');
  });
});
