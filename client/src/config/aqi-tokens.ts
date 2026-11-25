import type { AqiCategory } from '@/types';

export interface AqiVisualToken {
  label: AqiCategory;
  rangeLabel: string;
  badgeClass: string;
  surfaceClass: string;
  accentTextClass: string;
  borderClass: string;
}

/**
 * Accessible CPCB NAQI visual tokens supporting both Light and Dark themes.
 * Always pair color tokens with category label and icon cue.
 */
export const CPCB_AQI_TOKENS: Record<AqiCategory, AqiVisualToken> = {
  Good: {
    label: 'Good',
    rangeLabel: '0–50',
    badgeClass: 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-zinc-950',
    surfaceClass: 'bg-emerald-50/70 dark:bg-emerald-950/35',
    accentTextClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-200/90 dark:border-emerald-800/60',
  },
  Satisfactory: {
    label: 'Satisfactory',
    rangeLabel: '51–100',
    badgeClass: 'bg-lime-600 text-white dark:bg-lime-500 dark:text-zinc-950',
    surfaceClass: 'bg-lime-50/70 dark:bg-lime-950/35',
    accentTextClass: 'text-lime-700 dark:text-lime-400',
    borderClass: 'border-lime-200/90 dark:border-lime-800/60',
  },
  Moderate: {
    label: 'Moderate',
    rangeLabel: '101–200',
    badgeClass: 'bg-amber-600 text-white dark:bg-amber-500 dark:text-zinc-950',
    surfaceClass: 'bg-amber-50/75 dark:bg-amber-950/35',
    accentTextClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-200/90 dark:border-amber-800/60',
  },
  Poor: {
    label: 'Poor',
    rangeLabel: '201–300',
    badgeClass: 'bg-orange-600 text-white dark:bg-orange-500 dark:text-zinc-950',
    surfaceClass: 'bg-orange-50/75 dark:bg-orange-950/35',
    accentTextClass: 'text-orange-700 dark:text-orange-400',
    borderClass: 'border-orange-200/90 dark:border-orange-800/60',
  },
  'Very Poor': {
    label: 'Very Poor',
    rangeLabel: '301–400',
    badgeClass: 'bg-red-600 text-white dark:bg-red-500 dark:text-white',
    surfaceClass: 'bg-red-50/75 dark:bg-red-950/35',
    accentTextClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-200/90 dark:border-red-800/60',
  },
  Severe: {
    label: 'Severe',
    rangeLabel: '401–500+',
    badgeClass: 'bg-rose-900 text-white dark:bg-rose-600 dark:text-white',
    surfaceClass: 'bg-rose-100/80 dark:bg-rose-950/45',
    accentTextClass: 'text-rose-900 dark:text-rose-300',
    borderClass: 'border-rose-300 dark:border-rose-800/70',
  },
  Unavailable: {
    label: 'Unavailable',
    rangeLabel: 'N/A',
    badgeClass: 'bg-zinc-700 text-white dark:bg-zinc-700 dark:text-zinc-100',
    surfaceClass: 'bg-zinc-100/80 dark:bg-zinc-900/70',
    accentTextClass: 'text-zinc-700 dark:text-zinc-300',
    borderClass: 'border-zinc-200 dark:border-zinc-800',
  },
};

export function getAqiToken(category: AqiCategory): AqiVisualToken {
  return CPCB_AQI_TOKENS[category] ?? CPCB_AQI_TOKENS.Unavailable;
}
