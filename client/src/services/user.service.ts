import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { getFirebaseDb } from '@/lib/firebase';
import {
  buildUserCreatePayload,
  buildUserUpdatePayload,
  mapFirestoreDocToUserModel,
  type UpdateUserInput,
  type UserModel,
} from '@/models/user.model';
import type { LocationOption } from '@/types';

const USERS_COLLECTION = 'users';

export async function getUserById(uid: string): Promise<UserModel | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) {
    return null;
  }
  return mapFirestoreDocToUserModel(uid, snap.data());
}

/**
 * Ensures `users/{uid}` exists after sign-in using `UserModel` schema compliant with `firestore.rules`.
 */
export async function ensureUserDocument(user: User): Promise<UserModel | null> {
  const db = getFirebaseDb();
  if (!db || !user.email) {
    return null;
  }

  const ref = doc(db, USERS_COLLECTION, user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return mapFirestoreDocToUserModel(user.uid, existing.data());
  }

  const payload = buildUserCreatePayload(user);
  await setDoc(ref, payload);

  const created = await getDoc(ref);
  if (created.exists()) {
    return mapFirestoreDocToUserModel(user.uid, created.data());
  }

  return {
    uid: payload.uid,
    displayName: payload.displayName,
    email: payload.email,
    defaultFamilyId: payload.defaultFamilyId,
    primaryLocation: payload.primaryLocation,
    aqiScalePreference: payload.aqiScalePreference,
    onboardingCompleted: payload.onboardingCompleted,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates editable fields on `users/{uid}` and returns the refreshed `UserModel`.
 */
export async function updateUserProfile(
  uid: string,
  input: UpdateUserInput,
): Promise<UserModel | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }
  const ref = doc(db, USERS_COLLECTION, uid);
  const payload = buildUserUpdatePayload(input);
  await updateDoc(ref, payload);
  return getUserById(uid);
}

export async function saveUserPrimaryLocation(
  uid: string,
  location: LocationOption,
): Promise<UserModel | null> {
  return updateUserProfile(uid, { primaryLocation: location });
}
