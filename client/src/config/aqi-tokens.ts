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
 * Accessible CPCB NAQI visual tokens (docs/UI_UX_SPEC.md §2).
 * Always pair color tokens with category label and icon cue.
 */
export const CPCB_AQI_TOKENS: Record<AqiCategory, AqiVisualToken> = {
  Good: {
    label: 'Good',
    rangeLabel: '0–50',
    badgeClass: 'bg-emerald-600 text-white',
    surfaceClass: 'bg-emerald-50/80',
    accentTextClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
  },
  Satisfactory: {
    label: 'Satisfactory',
    rangeLabel: '51–100',
    badgeClass: 'bg-lime-600 text-white',
    surfaceClass: 'bg-lime-50/80',
    accentTextClass: 'text-lime-700',
    borderClass: 'border-lime-200',
  },
  Moderate: {
    label: 'Moderate',
    rangeLabel: '101–200',
    badgeClass: 'bg-amber-600 text-white',
    surfaceClass: 'bg-amber-50/80',
    accentTextClass: 'text-amber-700',
    borderClass: 'border-amber-200',
  },
  Poor: {
    label: 'Poor',
    rangeLabel: '201–300',
    badgeClass: 'bg-orange-600 text-white',
    surfaceClass: 'bg-orange-50/80',
    accentTextClass: 'text-orange-700',
    borderClass: 'border-orange-200',
  },
  'Very Poor': {
    label: 'Very Poor',
    rangeLabel: '301–400',
    badgeClass: 'bg-red-600 text-white',
    surfaceClass: 'bg-red-50/80',
    accentTextClass: 'text-red-700',
    borderClass: 'border-red-200',
  },
  Severe: {
    label: 'Severe',
    rangeLabel: '401–500+',
    badgeClass: 'bg-rose-900 text-white',
    surfaceClass: 'bg-rose-100/90',
    accentTextClass: 'text-rose-900',
    borderClass: 'border-rose-300',
  },
  Unavailable: {
    label: 'Unavailable',
    rangeLabel: 'N/A',
    badgeClass: 'bg-slate-600 text-white',
    surfaceClass: 'bg-slate-100',
    accentTextClass: 'text-slate-700',
    borderClass: 'border-slate-300',
  },
};

export function getAqiToken(category: AqiCategory): AqiVisualToken {
  return CPCB_AQI_TOKENS[category] ?? CPCB_AQI_TOKENS.Unavailable;
}
