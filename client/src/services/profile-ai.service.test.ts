import { describe, expect, it } from 'vitest';

import { parseHouseholdLocally } from '@/services/profile-ai.service';

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
