import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { dedupeFetch, getCached, setCached } from '@/lib/client-cache';
import { getTodayLocalDateKey, type DailyPlanModel } from '@/models/planner.model';
import {
  generateDailyPlanCallable,
  getCachedTodayDailyPlan,
  getTodayDailyPlan,
  updatePlanCompletedItems,
} from '@/services/planner.service';

const PLAN_CACHE_TTL_MS = 10 * 60 * 1000;

function planCacheKey(uid: string, dateKey: string, locationId: string): string {
  return `daily_plan:${uid}:${dateKey}:${locationId}`;
}

export interface UseDailyPlanResult {
  plan: DailyPlanModel | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  generate: (forceRefresh?: boolean) => Promise<void>;
  toggleItemCompleted: (itemId: string) => Promise<void>;
}

export function useDailyPlan(): UseDailyPlanResult {
  const { user, userProfile } = useAuth();
  const { selectedLocation } = useSelectedLocation();
  const dateKey = getTodayLocalDateKey();
  const locationId = selectedLocation.locationId;
  const initialHit = user
    ? getCached<DailyPlanModel | null>(planCacheKey(user.uid, dateKey, locationId))
    : null;

  const [plan, setPlan] = useState<DailyPlanModel | null>(initialHit?.value ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialHit);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setPlan(null);
      setIsLoading(false);
      return;
    }

    const uid = user.uid;
    const key = planCacheKey(uid, dateKey, locationId);
    const memHit = getCached<DailyPlanModel | null>(key);

    async function loadPlan() {
      let renderedFromCache = false;
      if (memHit) {
        setPlan(memHit.value);
        setIsLoading(false);
        setError(null);
        renderedFromCache = true;
        if (memHit.isFresh) {
          return;
        }
      } else {
        setIsLoading(true);
        const localHit = await getCachedTodayDailyPlan(uid, dateKey, locationId);
        if (!active) {
          return;
        }
        if (localHit) {
          setPlan(localHit);
          setIsLoading(false);
          renderedFromCache = true;
        }
      }

      setError(null);
      try {
        const found = await dedupeFetch(`fetch:${key}`, () =>
          getTodayDailyPlan(uid, dateKey, locationId),
        );
        if (!active) {
          return;
        }
        setCached(key, found, PLAN_CACHE_TTL_MS);
        setPlan(found);
      } catch (err: unknown) {
        if (active && !renderedFromCache) {
          setError(err instanceof Error ? err.message : 'Unable to load today’s plan.');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadPlan();

    return () => {
      active = false;
    };
  }, [user, dateKey, locationId]);

  const generate = useCallback(
    async (forceRefresh = false) => {
      setIsGenerating(true);
      setError(null);
      try {
        const nextPlan = await generateDailyPlanCallable(selectedLocation, {
          familyId: userProfile?.defaultFamilyId ?? null,
          planDate: dateKey,
          forceRefresh,
        });
        setPlan(nextPlan);
        if (user) {
          setCached(
            planCacheKey(user.uid, dateKey, selectedLocation.locationId),
            nextPlan,
            PLAN_CACHE_TTL_MS,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to generate your Daily Clean-Air Plan right now.',
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedLocation, userProfile?.defaultFamilyId, dateKey, user],
  );

  const toggleItemCompleted = useCallback(
    async (itemId: string) => {
      if (!plan || !user) {
        return;
      }
      const prevIds = plan.completedItemIds;
      const exists = prevIds.includes(itemId);
      const nextIds = exists
        ? prevIds.filter((id) => id !== itemId)
        : [...prevIds, itemId];

      const optimistic: DailyPlanModel = { ...plan, completedItemIds: nextIds };
      const key = planCacheKey(user.uid, dateKey, locationId);
      setPlan(optimistic);
      setCached(key, optimistic, PLAN_CACHE_TTL_MS);
      try {
        await updatePlanCompletedItems(user.uid, plan.planId, nextIds);
      } catch {
        setPlan({ ...plan, completedItemIds: prevIds });
        setCached(key, plan, PLAN_CACHE_TTL_MS);
      }
    },
    [plan, user, dateKey, locationId],
  );

  return {
    plan,
    isLoading,
    isGenerating,
    error,
    generate,
    toggleItemCompleted,
  };
}
