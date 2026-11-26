import { Car, Footprints, Home, Leaf, ShieldAlert, Utensils } from 'lucide-react';

import type { RecommendationItem } from '@/types';

export const RECOMMENDATION_CATEGORY_META: Record<
  RecommendationItem['category'],
  { label: string; icon: typeof Home; accent: string }
> = {
  outdoor_activity: {
    label: 'Outdoors',
    icon: Footprints,
    accent: 'bg-sky-500/12 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  },
  commute: {
    label: 'Commute',
    icon: Car,
    accent: 'bg-indigo-500/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
  },
  indoor_air: {
    label: 'Home Air',
    icon: Home,
    accent: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  cooking_ventilation: {
    label: 'Kitchen',
    icon: Utensils,
    accent: 'bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  },
  sustainability: {
    label: 'Clean Swap',
    icon: Leaf,
    accent: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  health_precaution: {
    label: 'Health Alert',
    icon: ShieldAlert,
    accent: 'bg-red-500/12 text-red-700 dark:bg-red-400/15 dark:text-red-300',
  },
};
