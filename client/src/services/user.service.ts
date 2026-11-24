import type { User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

import { getFirebaseDb } from '@/lib/firebase';
import type { LocationOption } from '@/types';

export interface UserProfileRecord {
  uid: string;
  displayName: string;
  email: string;
  defaultFamilyId: string | null;
  primaryLocation: LocationOption | null;
  aqiScalePreference: 'CPCB_NAQI' | 'US_EPA';
  onboardingCompleted: boolean;
}

/**
 * Ensures `users/{uid}` exists after sign-in using exact field allow-lists
 * enforced by `firestore.rules`.
 */
export async function ensureUserDocument(user: User): Promise<UserProfileRecord | null> {
  const db = getFirebaseDb();
  if (!db || !user.email) {
    return null;
  }

  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as UserProfileRecord;
  }

  const displayName = (user.displayName?.trim() || user.email.split('@')[0] || 'BreatheWise User').slice(
    0,
    100,
  );
  const newRecord: UserProfileRecord = {
    uid: user.uid,
    displayName,
    email: user.email,
    defaultFamilyId: null,
    primaryLocation: null,
    aqiScalePreference: 'CPCB_NAQI',
    onboardingCompleted: false,
  };

  await setDoc(ref, {
    ...newRecord,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return newRecord;
}

export async function saveUserPrimaryLocation(
  uid: string,
  location: LocationOption,
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    primaryLocation: {
      locationId: location.locationId,
      city: location.city,
      state: location.state,
      country: location.country,
      label: location.label,
      lat: location.lat,
      lng: location.lng,
    },
    updatedAt: serverTimestamp(),
  });
}
