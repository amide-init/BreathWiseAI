import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase-ai', () => ({
  generateStructuredClientJson: vi.fn(),
}));

vi.mock('@/lib/callable-client', () => ({
  callFunction: vi.fn(),
}));

import { callFunction } from '@/lib/callable-client';
import { generateStructuredClientJson } from '@/lib/firebase-ai';
import {
  parseHouseholdDescription,
  parseHouseholdLocally,
  sanitizeParsedHouseholdDraft,
} from '@/services/profile-ai.service';

describe('parseHouseholdLocally', () => {
  it('extracts multi-member household, scooter commute, allergies, and honest habits', () => {
    const draft = parseHouseholdLocally(
      'Me, wife, and 7yo son with mild dust allergy; I ride a scooter 15 km, we light dhoop daily, and have no purifier.',
    );

    expect(draft.members.map((m) => m.nickname)).toEqual(['Me', 'Wife', 'Son (7y)']);
    expect(draft.members[2]).toMatchObject({
      role: 'child_school',
      ageGroup: '6_12',
      hasRespiratorySensitivity: true,
    });
    expect(draft.primaryCommuteMode).toBe('two_wheeler');
    expect(draft.dailyCommuteKm).toBe(15);
    expect(draft.incenseOrDhoopDaily).toBe(true);
    expect(draft.hasHepaPurifier).toBe(false);
  });

  it('extracts a single added member without forcing a duplicate Me when user only names a parent', () => {
    const draft = parseHouseholdLocally(
      'Add my 68yo dad who walks early morning and has heart sensitivity; someone smokes on the balcony.',
    );

    expect(draft.members).toHaveLength(1);
    expect(draft.members[0]).toMatchObject({
      nickname: 'Dad',
      role: 'elderly',
      ageGroup: '60_plus',
      hasCardiacSensitivity: true,
    });
    expect(draft.indoorSmokingPresent).toBe(true);
  });
});

describe('parseHouseholdDescription (Firebase AI Logic primary + fallback chain)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses client-side Firebase AI Logic first and skips Cloud Function when available', async () => {
    vi.mocked(generateStructuredClientJson).mockResolvedValueOnce({
      householdName: 'Verma Family',
      primaryCommuteMode: 'two_wheeler',
      dailyCommuteKm: 18,
      hasHepaPurifier: false,
      hasKitchenExhaust: true,
      indoorSmokingPresent: false,
      incenseOrDhoopDaily: true,
      members: [
        {
          nickname: 'Aarav',
          role: 'child_school',
          ageGroup: '6_12',
          hasRespiratorySensitivity: true,
          hasCardiacSensitivity: false,
          isPregnant: false,
        },
      ],
      summaryNote: 'Understood Verma Family with Aarav.',
    });

    const result = await parseHouseholdDescription('My 8yo son Aarav has dust allergy');
    expect(result.fallbackUsed).toBe(false);
    expect(result.householdName).toBe('Verma Family');
    expect(result.members[0]?.nickname).toBe('Aarav');
    expect(callFunction).not.toHaveBeenCalled();
  });

  it('falls back to Cloud Function and then local parser when Firebase AI Logic is unavailable', async () => {
    vi.mocked(generateStructuredClientJson).mockResolvedValueOnce(null);
    vi.mocked(callFunction).mockRejectedValueOnce(new Error('offline'));

    const result = await parseHouseholdDescription('Me and 68yo dad, no purifier');
    expect(result.fallbackUsed).toBe(true);
    expect(result.members.map((m) => m.nickname)).toEqual(['Me', 'Dad']);
  });

  it('clamps invalid enums and extreme commute distances safely', () => {
    const sanitized = sanitizeParsedHouseholdDraft(
      {
        dailyCommuteKm: 9999,
        primaryCommuteMode: 'spaceship' as never,
        members: [
          {
            nickname: 'Test',
            role: 'invalid_role' as never,
            ageGroup: '99_plus' as never,
            hasRespiratorySensitivity: false,
            hasCardiacSensitivity: false,
            isPregnant: false,
          },
        ],
      },
      'I drive a car 10 km',
    );
    expect(sanitized.dailyCommuteKm).toBe(200);
    expect(sanitized.primaryCommuteMode).toBe('personal_car');
    expect(sanitized.members[0]?.role).toBe('working_adult');
    expect(sanitized.members[0]?.ageGroup).toBe('18_45');
  });
});
