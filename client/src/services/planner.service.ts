import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { callFunction } from '@/lib/callable-client';
import { getFirebaseDb } from '@/lib/firebase';
import { getTodayLocalDateKey, type DailyPlanModel } from '@/models/planner.model';
import type { LocationOption } from '@/types';

const DAILY_PLANS_COLLECTION = 'daily_plans';

interface GenerateDailyPlanPayload {
  locationId: string;
  lat: number;
  lng: number;
  label: string;
  familyId?: string | null;
  planDate: string;
  forceRefresh?: boolean;
}

export async function getTodayDailyPlan(
  uid: string,
  planDate = getTodayLocalDateKey(),
): Promise<DailyPlanModel | null> {
  const db = getFirebaseDb();
  if (!db) {
    return null;
  }
  const q = query(
    collection(db, DAILY_PLANS_COLLECTION),
    where('userId', '==', uid),
    where('planDate', '==', planDate),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  const snaps = await getDocs(q);
  const first = snaps.docs[0];
  if (!first) {
    return null;
  }
  const data = first.data() as DailyPlanModel;
  return {
    ...data,
    planId: first.id,
    completedItemIds: Array.isArray(data.completedItemIds) ? data.completedItemIds : [],
  };
}

export function generateDailyPlanCallable(
  location: LocationOption,
  options?: { familyId?: string | null; planDate?: string; forceRefresh?: boolean },
): Promise<DailyPlanModel> {
  return callFunction<GenerateDailyPlanPayload, DailyPlanModel>('generate_daily_plan', {
    locationId: location.locationId,
    lat: location.lat,
    lng: location.lng,
    label: location.label,
    familyId: options?.familyId ?? null,
    planDate: options?.planDate ?? getTodayLocalDateKey(),
    forceRefresh: Boolean(options?.forceRefresh),
  });
}

/**
 * Updates ONLY `completedItemIds` to strictly comply with `firestore.rules`.
 */
export async function updatePlanCompletedItems(
  planId: string,
  completedItemIds: string[],
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) {
    return;
  }
  const bounded = Array.from(new Set(completedItemIds)).slice(0, 50);
  await updateDoc(doc(db, DAILY_PLANS_COLLECTION, planId), {
    completedItemIds: bounded,
  });
}
