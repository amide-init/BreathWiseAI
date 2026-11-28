import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

import { getFirebaseDb } from '@/lib/firebase';
import { getDocsFromLocalCache } from '@/lib/firestore-cache';
import type { LocationOption } from '@/types';

const USERS_COLLECTION = 'users';
const SAVED_CITIES_SUBCOLLECTION = 'saved_cities';

export interface SavedCityModel extends LocationOption {
  nickname?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function serializeTs(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  return typeof value === 'string' ? value : null;
}

function mapDocToSavedCity(docId: string, data: Record<string, unknown>): SavedCityModel {
  return {
    locationId: typeof data.locationId === 'string' ? data.locationId : docId,
    city: typeof data.city === 'string' ? data.city : docId,
    state: typeof data.state === 'string' ? data.state : '',
    country: typeof data.country === 'string' ? data.country : 'India',
    lat: typeof data.lat === 'number' ? data.lat : 0,
    lng: typeof data.lng === 'number' ? data.lng : 0,
    label: typeof data.label === 'string' ? data.label : docId,
    nickname: typeof data.nickname === 'string' ? data.nickname : null,
    createdAt: serializeTs(data.createdAt),
    updatedAt: serializeTs(data.updatedAt),
  };
}

export async function listCachedSavedCities(uid: string): Promise<SavedCityModel[] | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }
  const q = query(
    collection(db, USERS_COLLECTION, uid, SAVED_CITIES_SUBCOLLECTION),
    orderBy('updatedAt', 'desc'),
    limit(12),
  );
  const snaps = await getDocsFromLocalCache(q);
  if (!snaps) {
    return null;
  }
  return snaps.docs.map((d) => mapDocToSavedCity(d.id, d.data()));
}

export async function listSavedCities(uid: string): Promise<SavedCityModel[]> {
  const db = getFirebaseDb();
  if (!db) {
    return [];
  }
  const q = query(
    collection(db, USERS_COLLECTION, uid, SAVED_CITIES_SUBCOLLECTION),
    orderBy('updatedAt', 'desc'),
    limit(12),
  );
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => mapDocToSavedCity(d.id, d.data()));
}

export async function saveUserCity(
  uid: string,
  location: LocationOption,
  nickname?: string | null,
): Promise<SavedCityModel> {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Cloud Firestore is not configured.');
  }
  const ref = doc(db, USERS_COLLECTION, uid, SAVED_CITIES_SUBCOLLECTION, location.locationId);
  const existing = await getDoc(ref);

  const mutableFields = {
    city: location.city.trim().slice(0, 100),
    state: location.state?.trim() ? location.state.trim().slice(0, 100) : null,
    country: location.country?.trim() ? location.country.trim().slice(0, 100) : null,
    lat: location.lat,
    lng: location.lng,
    label: location.label.trim().slice(0, 160),
    nickname: nickname?.trim() ? nickname.trim().slice(0, 40) : null,
    updatedAt: serverTimestamp(),
  };

  if (existing.exists()) {
    await updateDoc(ref, mutableFields);
  } else {
    await setDoc(ref, {
      locationId: location.locationId,
      ...mutableFields,
      createdAt: serverTimestamp(),
    });
  }

  return {
    ...location,
    nickname: mutableFields.nickname,
    updatedAt: new Date().toISOString(),
  };
}

export async function removeUserCity(uid: string, locationId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }
  await deleteDoc(doc(db, USERS_COLLECTION, uid, SAVED_CITIES_SUBCOLLECTION, locationId));
}
