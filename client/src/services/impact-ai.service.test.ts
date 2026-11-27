import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase-ai', () => ({
  generateStructuredClientJson: vi.fn(),
}));

import { generateStructuredClientJson } from '@/lib/firebase-ai';
import {
  parseImpactActionDescription,
  parseImpactLocally,
  sanitizeParsedImpactDraft,
} from '@/services/impact-ai.service';

describe('impact-ai.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses emissions carpool descriptions locally with occupancy >= 2', () => {
    const draft = parseImpactLocally('Carpooled 18 km to office with 3 colleagues instead of petrol car');
    expect(draft.impactDomain).toBe('emissions_reduction');
    expect(draft.actionType).toBe('carpool');
    expect(draft.distanceKm).toBe(18);
    expect(draft.occupancy).toBe(4);
    expect('estimatedCo2AvoidedKg' in draft).toBe(false);
  });

  it('parses exposure-reduction descriptions separately from emissions', () => {
    const draft = parseImpactLocally('Skipped morning run and did 45 min indoor yoga instead');
    expect(draft.impactDomain).toBe('exposure_reduction');
    expect(draft.actionType).toBe('indoor_exercise_swap');
    expect(draft.durationMinutes).toBe(45);
  });

  it('uses Firebase AI Logic structured output and enforces domain/action alignment', async () => {
    vi.mocked(generateStructuredClientJson).mockResolvedValueOnce({
      impactDomain: 'emissions_reduction',
      actionType: 'n95_mask_used', // mismatched domain intentionally tested
      title: 'Wore N95 during commute',
      durationMinutes: 60,
    });

    const result = await parseImpactActionDescription('Wore N95 mask for 1 hour commute');
    expect(result.fallbackUsed).toBe(false);
    expect(result.actionType).toBe('n95_mask_used');
    expect(result.impactDomain).toBe('exposure_reduction');
  });

  it('clamps carpool occupancy and distance bounds safely', () => {
    const sanitized = sanitizeParsedImpactDraft(
      {
        actionType: 'carpool',
        distanceKm: 1500,
        occupancy: 1,
      },
      'carpooled to office',
    );
    expect(sanitized.distanceKm).toBe(500);
    expect(sanitized.occupancy).toBe(2);
  });
});
