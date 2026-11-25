import { Footprints, Home, Shield, Users } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { AqiCategory, QuickDecision, QuickDecisionStatus } from '@/types';

const DECISION_ICONS: Record<QuickDecision['id'], typeof Footprints> = {
  exercise: Footprints,
  kids_play: Users,
  windows: Home,
  mask: Shield,
};

const STATUS_STYLES: Record<
  QuickDecisionStatus,
  { card: string; pill: string; iconBg: string; pillLabel: string }
> = {
  good: {
    card: 'border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-900/50 dark:bg-emerald-950/25',
    pill: 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300',
    iconBg: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300',
    pillLabel: 'OK',
  },
  caution: {
    card: 'border-amber-200/80 bg-amber-50/55 dark:border-amber-900/50 dark:bg-amber-950/25',
    pill: 'bg-amber-500/15 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300',
    iconBg: 'bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300',
    pillLabel: 'Careful',
  },
  avoid: {
    card: 'border-red-200/80 bg-red-50/55 dark:border-red-900/50 dark:bg-red-950/25',
    pill: 'bg-red-500/15 text-red-800 dark:bg-red-400/20 dark:text-red-300',
    iconBg: 'bg-red-500/15 text-red-700 dark:bg-red-400/20 dark:text-red-300',
    pillLabel: 'Avoid',
  },
  unknown: {
    card: 'border-zinc-200/80 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-900/60',
    pill: 'bg-zinc-200/70 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    iconBg: 'bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    pillLabel: 'Check',
  },
};

/**
 * Deterministic fallback verdicts derived strictly from CPCB category if a cached
 * API response predates `quickDecisions`.
 */
function deriveFallbackDecisions(category: AqiCategory): QuickDecision[] {
  if (category === 'Unavailable') {
    return [
      {
        id: 'exercise',
        label: 'Outdoor Exercise',
        status: 'unknown',
        verdict: 'Check local air first',
        shortReason: 'Live reading is temporarily unavailable.',
      },
      {
        id: 'kids_play',
        label: 'Kids Play',
        status: 'unknown',
        verdict: 'Play it safe',
        shortReason: 'Keep indoors if air looks hazy outside.',
      },
      {
        id: 'windows',
        label: 'Home Windows',
        status: 'unknown',
        verdict: 'Check outside haze',
        shortReason: 'Keep closed if air smells smoky.',
      },
      {
        id: 'mask',
        label: 'Outdoor Mask',
        status: 'unknown',
        verdict: 'Keep one handy',
        shortReason: 'Carry an N95 if visibility looks low.',
      },
    ];
  }

  if (category === 'Good' || category === 'Satisfactory') {
    return [
      {
        id: 'exercise',
        label: 'Outdoor Exercise',
        status: 'good',
        verdict: 'Good to go out',
        shortReason: 'Comfortable air for walks and runs.',
      },
      {
        id: 'kids_play',
        label: 'Kids Play',
        status: 'good',
        verdict: 'Safe to play out',
        shortReason: 'Outdoor park time looks great right now.',
      },
      {
        id: 'windows',
        label: 'Home Windows',
        status: 'good',
        verdict: 'Open for fresh air',
        shortReason: 'Great time to ventilate your home.',
      },
      {
        id: 'mask',
        label: 'Outdoor Mask',
        status: 'good',
        verdict: 'No mask needed',
        shortReason: 'Clean enough for normal errands.',
      },
    ];
  }

  if (category === 'Moderate') {
    return [
      {
        id: 'exercise',
        label: 'Outdoor Exercise',
        status: 'caution',
        verdict: 'Light workout OK',
        shortReason: 'Avoid heavy runs near busy traffic.',
      },
      {
        id: 'kids_play',
        label: 'Kids Play',
        status: 'caution',
        verdict: 'Short outdoor play',
        shortReason: 'Take indoor breaks if anyone coughs.',
      },
      {
        id: 'windows',
        label: 'Home Windows',
        status: 'caution',
        verdict: 'Brief airing only',
        shortReason: 'Open briefly away from peak traffic.',
      },
      {
        id: 'mask',
        label: 'Outdoor Mask',
        status: 'good',
        verdict: 'Optional in traffic',
        shortReason: 'Helpful on busy roads if sensitive.',
      },
    ];
  }

  return [
    {
      id: 'exercise',
      label: 'Outdoor Exercise',
      status: 'avoid',
      verdict: 'Exercise indoors',
      shortReason: 'Heavy breathing pulls extra fine dust deep in.',
    },
    {
      id: 'kids_play',
      label: 'Kids Play',
      status: 'avoid',
      verdict: 'Keep play indoors',
      shortReason: 'Growing lungs absorb more smog outside.',
    },
    {
      id: 'windows',
      label: 'Home Windows',
      status: 'avoid',
      verdict: 'Keep windows shut',
      shortReason: 'Block outside smog and run HEPA if owned.',
    },
    {
      id: 'mask',
      label: 'Outdoor Mask',
      status: 'avoid',
      verdict: 'Wear N95 outdoors',
      shortReason: 'A snug N95 filters tiny invisible particles.',
    },
  ];
}

export function QuickDecisionsStrip({
  decisions,
  category,
}: {
  decisions?: QuickDecision[];
  category: AqiCategory;
}) {
  const items = decisions && decisions.length > 0 ? decisions : deriveFallbackDecisions(category);

  return (
    <section aria-label="Right now everyday guidance" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Right Now — Everyday Answers
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = DECISION_ICONS[item.id];
          const style = STATUS_STYLES[item.status];
          return (
            <div
              key={item.id}
              className={cn(
                'flex flex-col justify-between gap-2 rounded-2xl border p-3.5 transition-colors',
                style.card,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl',
                    style.iconBg,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    style.pill,
                  )}
                >
                  {style.pillLabel}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {item.label}
                </p>
                <p className="font-display mt-0.5 text-sm font-bold leading-snug text-zinc-950 dark:text-zinc-50">
                  {item.verdict}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
                  {item.shortReason}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
