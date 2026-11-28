import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';

import { callFunction } from '@/lib/callable-client';
import { getFirebaseDb } from '@/lib/firebase';
import { getDocFromLocalCache, getDocsFromLocalCache } from '@/lib/firestore-cache';
import { getCurrentTimeWindow, type TimeWindowKey } from '@/lib/time-window';
import { getTodayLocalDateKey, type DailyPlanModel } from '@/models/planner.model';
import type { LocationOption } from '@/types';

const USERS_COLLECTION = 'users';
const DAILY_PLANS_SUBCOLLECTION = 'daily_plans';

export function makeDailyPlanDocId(planDate: string, locationId: string): string {
  const safeDate = planDate.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 16);
  const safeLoc = locationId.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  return `${safeDate}_${safeLoc}`;
}

interface GenerateDailyPlanPayload {
  locationId: string;
  lat: number;
  lng: number;
  label: string;
  familyId?: string | null;
  planDate: string;
  forceRefresh?: boolean;
  currentTimeWindow: TimeWindowKey;
}

export async function getCachedTodayDailyPlan(
  uid: string,
  planDate = getTodayLocalDateKey(),
  locationId?: string,
): Promise<DailyPlanModel | null> {
  const db = getFirebaseDb();
  if (!db || !locationId) {
    return null;
  }
  const docId = makeDailyPlanDocId(planDate, locationId);
  const snap = await getDocFromLocalCache(
    doc(db, USERS_COLLECTION, uid, DAILY_PLANS_SUBCOLLECTION, docId),
  );
  if (!snap || !snap.exists()) {
    return null;
  }
  const data = snap.data() as DailyPlanModel;
  return {
    ...data,
    planId: snap.id,
    completedItemIds: Array.isArray(data.completedItemIds) ? data.completedItemIds : [],
  };
}

export async function getTodayDailyPlan(
  uid: string,
  planDate = getTodayLocalDateKey(),
  locationId?: string,
): Promise<DailyPlanModel | null> {
  const db = getFirebaseDb();
  if (!db || !locationId) {
    return null;
  }
  // O(1) direct point-read under users/{uid}/daily_plans/{planDate}_{locationId}
  const docId = makeDailyPlanDocId(planDate, locationId);
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid, DAILY_PLANS_SUBCOLLECTION, docId));
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data() as DailyPlanModel;
  return {
    ...data,
    planId: snap.id,
    completedItemIds: Array.isArray(data.completedItemIds) ? data.completedItemIds : [],
  };
}

export function generateDailyPlanCallable(
  location: LocationOption,
  options?: {
    familyId?: string | null;
    planDate?: string;
    forceRefresh?: boolean;
    currentTimeWindow?: TimeWindowKey;
  },
): Promise<DailyPlanModel> {
  return callFunction<GenerateDailyPlanPayload, DailyPlanModel>('generate_daily_plan', {
    locationId: location.locationId,
    lat: location.lat,
    lng: location.lng,
    label: location.label,
    familyId: options?.familyId ?? null,
    planDate: options?.planDate ?? getTodayLocalDateKey(),
    forceRefresh: Boolean(options?.forceRefresh),
    currentTimeWindow: options?.currentTimeWindow ?? getCurrentTimeWindow(),
  });
}

/**
 * Lists locationIds under `users/{uid}/daily_plans` that already have a plan for `planDate`.
 * Uses a single-field equality query on `planDate` (auto-indexed; zero composite indexes needed).
 */
export async function listCachedTodayPlannedLocationIds(
  uid: string,
  planDate = getTodayLocalDateKey(),
): Promise<string[] | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }
  const q = query(
    collection(db, USERS_COLLECTION, uid, DAILY_PLANS_SUBCOLLECTION),
    where('planDate', '==', planDate),
  );
  const snaps = await getDocsFromLocalCache(q);
  if (!snaps) {
    return null;
  }
  return snaps.docs
    .map((d) => {
      const loc = d.data().locationId;
      return typeof loc === 'string' && loc ? loc : null;
    })
    .filter((id): id is string => id !== null);
}

export async function listTodayPlannedLocationIds(
  uid: string,
  planDate = getTodayLocalDateKey(),
): Promise<string[]> {
  const db = getFirebaseDb();
  if (!db) {
    return [];
  }
  const q = query(
    collection(db, USERS_COLLECTION, uid, DAILY_PLANS_SUBCOLLECTION),
    where('planDate', '==', planDate),
  );
  const snaps = await getDocs(q);
  return snaps.docs
    .map((d) => {
      const loc = d.data().locationId;
      return typeof loc === 'string' && loc ? loc : null;
    })
    .filter((id): id is string => id !== null);
}

/**
 * Updates ONLY `completedItemIds` under `users/{uid}/daily_plans/{planId}`.
 */
export async function updatePlanCompletedItems(
  uid: string,
  planId: string,
  completedItemIds: string[],
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }
  const bounded = Array.from(new Set(completedItemIds)).slice(0, 50);
  await updateDoc(doc(db, USERS_COLLECTION, uid, DAILY_PLANS_SUBCOLLECTION, planId), {
    completedItemIds: bounded,
  });
}
