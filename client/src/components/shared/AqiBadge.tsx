import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  OctagonAlert,
  ShieldAlert,
  Wind,
} from 'lucide-react';

import { getAqiToken } from '@/config/aqi-tokens';
import { cn } from '@/lib/cn';
import type { AqiCategory } from '@/types';

const CATEGORY_ICONS: Record<AqiCategory, typeof Wind> = {
  Good: CheckCircle2,
  Satisfactory: Wind,
  Moderate: AlertCircle,
  Poor: AlertTriangle,
  'Very Poor': ShieldAlert,
  Severe: OctagonAlert,
  Unavailable: CloudOff,
};

export interface AqiBadgeProps {
  category: AqiCategory;
  aqi?: number | null;
  className?: string;
}

/**
 * Accessible CPCB NAQI badge pairing color token + severity icon + text label.
 */
export function AqiBadge({ category, aqi, className }: AqiBadgeProps) {
  const token = getAqiToken(category);
  const Icon = CATEGORY_ICONS[category] ?? CloudOff;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        token.badgeClass,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        {token.label}
        {aqi !== null && aqi !== undefined ? ` · ${aqi}` : ''}
      </span>
    </span>
  );
}
