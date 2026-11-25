import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { getTodayLocalDateKey, type DailyPlanModel } from '@/models/planner.model';
import {
  generateDailyPlanCallable,
  getTodayDailyPlan,
  updatePlanCompletedItems,
} from '@/services/planner.service';

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
  const [plan, setPlan] = useState<DailyPlanModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) {
      setPlan(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    getTodayDailyPlan(user.uid, getTodayLocalDateKey())
      .then((found) => {
        if (!active) {
          return;
        }
        if (found && found.locationId === selectedLocation.locationId) {
          setPlan(found);
        } else {
          setPlan(found);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to load today’s plan.');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, selectedLocation.locationId]);

  const generate = useCallback(
    async (forceRefresh = false) => {
      setIsGenerating(true);
      setError(null);
      try {
        const nextPlan = await generateDailyPlanCallable(selectedLocation, {
          familyId: userProfile?.defaultFamilyId ?? null,
          planDate: getTodayLocalDateKey(),
          forceRefresh,
        });
        setPlan(nextPlan);
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
    [selectedLocation, userProfile?.defaultFamilyId],
  );

  const toggleItemCompleted = useCallback(
    async (itemId: string) => {
      if (!plan) {
        return;
      }
      const prevIds = plan.completedItemIds;
      const exists = prevIds.includes(itemId);
      const nextIds = exists
        ? prevIds.filter((id) => id !== itemId)
        : [...prevIds, itemId];

      setPlan({ ...plan, completedItemIds: nextIds });
      try {
        await updatePlanCompletedItems(plan.planId, nextIds);
      } catch {
        setPlan({ ...plan, completedItemIds: prevIds });
      }
    },
    [plan],
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
