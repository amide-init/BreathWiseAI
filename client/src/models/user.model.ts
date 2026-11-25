import type { User } from 'firebase/auth';
import { serverTimestamp, Timestamp, type DocumentData, type FieldValue } from 'firebase/firestore';

import type { LocationOption } from '@/types';

export type AqiScalePreference = 'CPCB_NAQI' | 'US_EPA';

/**
 * Canonical Firestore `users/{uid}` document model (aligned with docs/DATA_MODEL.md & firestore.rules).
 */
export interface UserModel {
  readonly uid: string;
  displayName: string;
  readonly email: string;
  defaultFamilyId: string | null;
  primaryLocation: LocationOption | null;
  aqiScalePreference: AqiScalePreference;
  onboardingCompleted: boolean;
  readonly createdAt: string | null;
  updatedAt: string | null;
}

/**
 * Strictly editable fields allowed on `users/{uid}` updates.
 * Immutable fields (`uid`, `email`, `createdAt`) are intentionally excluded.
 */
export interface UpdateUserInput {
  displayName?: string;
  defaultFamilyId?: string | null;
  primaryLocation?: LocationOption | null;
  aqiScalePreference?: AqiScalePreference;
  onboardingCompleted?: boolean;
}

export interface FirestoreUserCreatePayload {
  uid: string;
  displayName: string;
  email: string;
  defaultFamilyId: string | null;
  primaryLocation: LocationOption | null;
  aqiScalePreference: AqiScalePreference;
  onboardingCompleted: boolean;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

function normalizeLocation(loc: LocationOption | null | undefined): LocationOption | null {
  if (!loc) {
    return null;
  }
  return {
    locationId: loc.locationId,
    city: loc.city.trim().slice(0, 100),
    state: (loc.state ?? '').trim().slice(0, 100),
    country: (loc.country ?? 'India').trim().slice(0, 100),
    label: loc.label.trim().slice(0, 160),
    lat: loc.lat,
    lng: loc.lng,
  };
}

function serializeTimestamp(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

/**
 * Builds a `firestore.rules`-compliant creation payload from a signed-in Firebase Auth user.
 */
export function buildUserCreatePayload(user: User): FirestoreUserCreatePayload {
  const email = user.email?.trim() ?? '';
  const fallbackName = email.includes('@') ? email.split('@')[0] : 'BreatheWise User';
  const displayName = (user.displayName?.trim() || fallbackName || 'BreatheWise User').slice(0, 100);

  return {
    uid: user.uid,
    displayName,
    email,
    defaultFamilyId: null,
    primaryLocation: null,
    aqiScalePreference: 'CPCB_NAQI',
    onboardingCompleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

/**
 * Maps a raw Firestore `users/{uid}` document into a typed `UserModel`.
 */
export function mapFirestoreDocToUserModel(uid: string, data: DocumentData): UserModel {
  const scale: AqiScalePreference =
    data.aqiScalePreference === 'US_EPA' ? 'US_EPA' : 'CPCB_NAQI';

  return {
    uid: typeof data.uid === 'string' ? data.uid : uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'BreatheWise User',
    email: typeof data.email === 'string' ? data.email : '',
    defaultFamilyId: typeof data.defaultFamilyId === 'string' ? data.defaultFamilyId : null,
    primaryLocation: normalizeLocation(data.primaryLocation as LocationOption | null | undefined),
    aqiScalePreference: scale,
    onboardingCompleted: Boolean(data.onboardingCompleted),
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

/**
 * Builds a sanitized partial update payload enforcing field bounds before writing to Firestore.
 */
export function buildUserUpdatePayload(input: UpdateUserInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.displayName !== undefined) {
    const cleaned = input.displayName.trim().slice(0, 100);
    if (!cleaned) {
      throw new Error('Display name cannot be empty.');
    }
    payload.displayName = cleaned;
  }

  if (input.defaultFamilyId !== undefined) {
    payload.defaultFamilyId = input.defaultFamilyId;
  }

  if (input.primaryLocation !== undefined) {
    payload.primaryLocation = normalizeLocation(input.primaryLocation);
  }

  if (input.aqiScalePreference !== undefined) {
    payload.aqiScalePreference = input.aqiScalePreference;
  }

  if (input.onboardingCompleted !== undefined) {
    payload.onboardingCompleted = input.onboardingCompleted;
  }

  return payload;
}
