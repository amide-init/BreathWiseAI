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
 * Calm, low-glare CPCB NAQI visual tokens supporting both Light and Obsidian Dark themes.
 * Uses restrained translucent tints in dark mode instead of saturated neon blocks.
 */
export const CPCB_AQI_TOKENS: Record<AqiCategory, AqiVisualToken> = {
  Good: {
    label: 'Good',
    rangeLabel: '0–50',
    badgeClass:
      'bg-emerald-600/90 text-white dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-1 dark:ring-emerald-400/25',
    surfaceClass: 'bg-emerald-50/60 dark:bg-emerald-500/[0.06]',
    accentTextClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-200/80 dark:border-emerald-400/20',
  },
  Satisfactory: {
    label: 'Satisfactory',
    rangeLabel: '51–100',
    badgeClass:
      'bg-teal-600/90 text-white dark:bg-teal-400/15 dark:text-teal-300 dark:ring-1 dark:ring-teal-400/25',
    surfaceClass: 'bg-teal-50/60 dark:bg-teal-500/[0.06]',
    accentTextClass: 'text-teal-700 dark:text-teal-300',
    borderClass: 'border-teal-200/80 dark:border-teal-400/20',
  },
  Moderate: {
    label: 'Moderate',
    rangeLabel: '101–200',
    badgeClass:
      'bg-amber-500/90 text-white dark:bg-amber-400/15 dark:text-amber-300 dark:ring-1 dark:ring-amber-400/25',
    surfaceClass: 'bg-amber-50/60 dark:bg-amber-500/[0.06]',
    accentTextClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-200/80 dark:border-amber-400/20',
  },
  Poor: {
    label: 'Poor',
    rangeLabel: '201–300',
    badgeClass:
      'bg-orange-600/90 text-white dark:bg-orange-400/15 dark:text-orange-300 dark:ring-1 dark:ring-orange-400/25',
    surfaceClass: 'bg-orange-50/60 dark:bg-orange-500/[0.07]',
    accentTextClass: 'text-orange-700 dark:text-orange-300',
    borderClass: 'border-orange-200/80 dark:border-orange-400/20',
  },
  'Very Poor': {
    label: 'Very Poor',
    rangeLabel: '301–400',
    badgeClass:
      'bg-rose-600/90 text-white dark:bg-rose-400/15 dark:text-rose-300 dark:ring-1 dark:ring-rose-400/25',
    surfaceClass: 'bg-rose-50/60 dark:bg-rose-500/[0.07]',
    accentTextClass: 'text-rose-700 dark:text-rose-300',
    borderClass: 'border-rose-200/80 dark:border-rose-400/20',
  },
  Severe: {
    label: 'Severe',
    rangeLabel: '401–500+',
    badgeClass:
      'bg-rose-900 text-white dark:bg-rose-500/25 dark:text-rose-200 dark:ring-1 dark:ring-rose-400/35',
    surfaceClass: 'bg-rose-100/70 dark:bg-rose-500/[0.11]',
    accentTextClass: 'text-rose-900 dark:text-rose-200',
    borderClass: 'border-rose-300/90 dark:border-rose-400/30',
  },
  Unavailable: {
    label: 'Unavailable',
    rangeLabel: 'N/A',
    badgeClass:
      'bg-slate-600 text-white dark:bg-white/[0.08] dark:text-[#CBD5E1]',
    surfaceClass: 'bg-slate-100/70 dark:bg-white/[0.03]',
    accentTextClass: 'text-slate-600 dark:text-[#94A3B8]',
    borderClass: 'border-slate-200/80 dark:border-white/[0.08]',
  },
};

export function getAqiToken(category: AqiCategory): AqiVisualToken {
  return CPCB_AQI_TOKENS[category] ?? CPCB_AQI_TOKENS.Unavailable;
}
