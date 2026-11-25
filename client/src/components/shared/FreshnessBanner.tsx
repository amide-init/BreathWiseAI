import { Clock, CloudOff, Radio } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { formatObservedRelative } from '@/lib/formatters';
import type { FreshnessStatus } from '@/types';

export interface FreshnessBannerProps {
  freshnessStatus: FreshnessStatus;
  observedAt: string | null;
  source: string;
}

/**
 * Enforces PRD §9 data freshness transparency across all environmental views.
 */
export function FreshnessBanner({ freshnessStatus, observedAt, source }: FreshnessBannerProps) {
  const relative = formatObservedRelative(observedAt);

  if (freshnessStatus === 'fresh') {
    return (
      <div className="inline-flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-300">
          <Radio className="h-3 w-3" aria-hidden="true" />
          Live
        </span>
        <span>Updated {relative}</span>
        <span className="text-zinc-300 dark:text-zinc-700">•</span>
        <span className="truncate">Source: {source}</span>
      </div>
    );
  }

  if (freshnessStatus === 'stale') {
    return (
      <Alert variant="warning">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Showing cached data ({relative})</p>
          <p className="text-xs opacity-90">
            Live station updates from {source} are temporarily unreachable. Avoid treating cached
            numbers as current readings.
          </p>
        </div>
      </Alert>
    );
  }

  return (
    <Alert variant="neutral">
      <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Live air-quality data currently unavailable</p>
        <p className="text-xs opacity-90">
          We never fabricate AQI or pollutant readings. Please retry shortly or check official local
          CPCB advisories.
        </p>
      </div>
    </Alert>
  );
}
