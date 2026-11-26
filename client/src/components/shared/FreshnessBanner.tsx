import { Clock, CloudOff, Radio } from 'lucide-react';

import { formatObservedRelative } from '@/lib/formatters';
import type { FreshnessStatus } from '@/types';

export interface FreshnessBannerProps {
  freshnessStatus: FreshnessStatus;
  observedAt: string | null;
  source: string;
}

/**
 * Compact, whisper-quiet freshness metadata line enforcing PRD §9 transparency
 * (status + relative observation timestamp + source) without cluttering the UI.
 */
export function FreshnessBanner({ freshnessStatus, observedAt, source }: FreshnessBannerProps) {
  const relative = formatObservedRelative(observedAt);

  if (freshnessStatus === 'fresh') {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-[#8E9AA8]">
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-500/20 dark:bg-teal-400/12 dark:text-teal-300 dark:ring-teal-400/20">
          <Radio className="h-2.5 w-2.5" aria-hidden="true" />
          Live
        </span>
        <span>Updated {relative}</span>
        <span className="text-slate-300 dark:text-white/15">·</span>
        <span className="truncate">{source}</span>
      </div>
    );
  }

  if (freshnessStatus === 'stale') {
    return (
      <div
        title={`Showing cached station data from ${source} (${relative}). Avoid treating cached figures as live readings.`}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-[#8E9AA8]"
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-400/12 dark:text-amber-300 dark:ring-amber-400/20">
          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
          Cached ({relative})
        </span>
        <span className="truncate">Not live · {source}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-[#8E9AA8]">
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-white/[0.08] dark:text-[#CBD5E1]">
        <CloudOff className="h-2.5 w-2.5" aria-hidden="true" />
        Unavailable
      </span>
      <span>Live station data unavailable — no readings fabricated</span>
    </div>
  );
}
