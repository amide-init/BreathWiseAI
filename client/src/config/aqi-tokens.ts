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
 * Official Google 4-color RGB palette (Green #34A853, Blue #4285F4, Yellow #FBBC05, Red #EA4335)
 * adapted cleanly for CPCB NAQI severity categories across Light & Gemini Dark modes.
 */
export const CPCB_AQI_TOKENS: Record<AqiCategory, AqiVisualToken> = {
  Good: {
    label: 'Good',
    rangeLabel: '0–50',
    badgeClass:
      'bg-[#34A853] text-white dark:bg-[#81C995]/18 dark:text-[#81C995] dark:ring-1 dark:ring-[#81C995]/30',
    surfaceClass: 'bg-[#34A853]/[0.05] dark:bg-[#1E1F20]',
    accentTextClass: 'text-[#1E8E3E] dark:text-[#81C995]',
    borderClass: 'border-[#34A853]/30 dark:border-[#81C995]/25',
  },
  Satisfactory: {
    label: 'Satisfactory',
    rangeLabel: '51–100',
    badgeClass:
      'bg-[#4285F4] text-white dark:bg-[#8AB4F8]/18 dark:text-[#8AB4F8] dark:ring-1 dark:ring-[#8AB4F8]/30',
    surfaceClass: 'bg-[#4285F4]/[0.05] dark:bg-[#1E1F20]',
    accentTextClass: 'text-[#1A73E8] dark:text-[#8AB4F8]',
    borderClass: 'border-[#4285F4]/30 dark:border-[#8AB4F8]/25',
  },
  Moderate: {
    label: 'Moderate',
    rangeLabel: '101–200',
    badgeClass:
      'bg-[#FBBC05] text-[#202124] dark:bg-[#FDD663]/18 dark:text-[#FDD663] dark:ring-1 dark:ring-[#FDD663]/30',
    surfaceClass: 'bg-[#FBBC05]/[0.06] dark:bg-[#1E1F20]',
    accentTextClass: 'text-[#B06000] dark:text-[#FDD663]',
    borderClass: 'border-[#FBBC05]/40 dark:border-[#FDD663]/25',
  },
  Poor: {
    label: 'Poor',
    rangeLabel: '201–300',
    badgeClass:
      'bg-[#FA7B17] text-white dark:bg-[#FCAD70]/18 dark:text-[#FCAD70] dark:ring-1 dark:ring-[#FCAD70]/30',
    surfaceClass: 'bg-[#FA7B17]/[0.06] dark:bg-[#1E1F20]',
    accentTextClass: 'text-[#C25900] dark:text-[#FCAD70]',
    borderClass: 'border-[#FA7B17]/35 dark:border-[#FCAD70]/25',
  },
  'Very Poor': {
    label: 'Very Poor',
    rangeLabel: '301–400',
    badgeClass:
      'bg-[#EA4335] text-white dark:bg-[#F28B82]/18 dark:text-[#F28B82] dark:ring-1 dark:ring-[#F28B82]/30',
    surfaceClass: 'bg-[#EA4335]/[0.06] dark:bg-[#1E1F20]',
    accentTextClass: 'text-[#C5221F] dark:text-[#F28B82]',
    borderClass: 'border-[#EA4335]/35 dark:border-[#F28B82]/25',
  },
  Severe: {
    label: 'Severe',
    rangeLabel: '401–500+',
    badgeClass:
      'bg-[#A50E0E] text-white dark:bg-[#EA4335]/28 dark:text-[#FAD2CF] dark:ring-1 dark:ring-[#F28B82]/40',
    surfaceClass: 'bg-[#EA4335]/[0.10] dark:bg-[#1E1F20]',
    accentTextClass: 'text-[#A50E0E] dark:text-[#F28B82]',
    borderClass: 'border-[#EA4335]/45 dark:border-[#F28B82]/35',
  },
  Unavailable: {
    label: 'Unavailable',
    rangeLabel: 'N/A',
    badgeClass:
      'bg-[#5F6368] text-white dark:bg-white/[0.1] dark:text-[#E3E3E3]',
    surfaceClass: 'bg-[#F1F3F4]/70 dark:bg-[#1E1F20]',
    accentTextClass: 'text-[#5F6368] dark:text-[#9AA0A6]',
    borderClass: 'border-[#DADCE0] dark:border-white/[0.09]',
  },
};

export function getAqiToken(category: AqiCategory): AqiVisualToken {
  return CPCB_AQI_TOKENS[category] ?? CPCB_AQI_TOKENS.Unavailable;
}
