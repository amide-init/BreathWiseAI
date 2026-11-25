import { describe, expect, it } from 'vitest';

import { DEFAULT_CITY } from '@/config/cities';
import {
  buildFamilyCreatePayload,
  buildMemberCreatePayload,
} from '@/models/family.model';

describe('FamilyModel payload builders', () => {
  it('builds firestore.rules-compliant family payload with bounded numbers', () => {
    const payload = buildFamilyCreatePayload('uid_1', {
      householdName: '  Sharma Family  ',
      location: DEFAULT_CITY,
      transportationHabits: {
        primaryMode: 'personal_car',
        dailyCommuteKm: 22,
        vehicleFuelType: 'petrol',
        occupancy: 1,
      },
      exercisePreferences: {
        prefersOutdoor: true,
        preferredWindow: 'morning',
        activityType: 'walk',
      },
      indoorEquipment: {
        hasHepaPurifier: true,
        purifierRoomsCount: 2,
        hasKitchenExhaust: true,
        hasCrossVentilation: true,
        hasN95Masks: true,
        indoorSmokingPresent: false,
      },
    });

    expect(payload.ownerUserId).toBe('uid_1');
    expect(payload.householdName).toBe('Sharma Family');
    expect(payload.indoorEquipment.purifierRoomsCount).toBe(2);
    expect(payload.transportationHabits.dailyCommuteKm).toBe(22);
  });

  it('bounds optional health notes and omits empty health profiles', () => {
    const cleanMember = buildMemberCreatePayload('uid_1', {
      nickname: 'Child',
      role: 'child_school',
      ageGroup: '6_12',
    });
    expect(cleanMember.optionalHealthProfile).toBeNull();
    expect(cleanMember.schedule).toBeNull();

    const sensitiveMember = buildMemberCreatePayload('uid_1', {
      nickname: 'Grandparent',
      role: 'elderly',
      ageGroup: '60_plus',
      optionalHealthProfile: {
        hasRespiratorySensitivity: true,
        hasCardiacSensitivity: false,
        isPregnant: false,
        notes: 'Sensitive to winter smog',
      },
    });
    expect(sensitiveMember.optionalHealthProfile?.hasRespiratorySensitivity).toBe(true);
    expect(sensitiveMember.optionalHealthProfile?.notes).toBe('Sensitive to winter smog');
  });
});
