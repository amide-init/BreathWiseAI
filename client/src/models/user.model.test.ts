import { describe, expect, it } from 'vitest';

import {
  buildUserUpdatePayload,
  mapFirestoreDocToUserModel,
} from '@/models/user.model';

describe('UserModel helpers', () => {
  it('maps Firestore document into strongly typed UserModel', () => {
    const model = mapFirestoreDocToUserModel('uid_1', {
      uid: 'uid_1',
      displayName: 'Amina Sharma',
      email: 'amina@example.com',
      defaultFamilyId: 'fam_01',
      primaryLocation: {
        locationId: 'in-new-delhi-28.61-77.21',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        label: 'New Delhi, Delhi, India',
        lat: 28.6139,
        lng: 77.209,
      },
      aqiScalePreference: 'CPCB_NAQI',
      onboardingCompleted: true,
    });

    expect(model.uid).toBe('uid_1');
    expect(model.displayName).toBe('Amina Sharma');
    expect(model.aqiScalePreference).toBe('CPCB_NAQI');
    expect(model.primaryLocation?.city).toBe('New Delhi');
  });

  it('builds sanitized partial updates and rejects empty displayName', () => {
    const payload = buildUserUpdatePayload({
      displayName: '  Rohan Verma  ',
      aqiScalePreference: 'US_EPA',
    });
    expect(payload.displayName).toBe('Rohan Verma');
    expect(payload.aqiScalePreference).toBe('US_EPA');
    expect(payload).not.toHaveProperty('uid');
    expect(payload).not.toHaveProperty('email');

    expect(() => buildUserUpdatePayload({ displayName: '   ' })).toThrow();
  });
});
