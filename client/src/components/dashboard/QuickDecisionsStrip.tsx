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
    card: 'border-[#34A853]/25 bg-white/95 dark:border-[#81C995]/20 dark:bg-[#1E1F20]/95',
    pill: 'bg-[#34A853]/12 text-[#1E8E3E] dark:bg-[#81C995]/15 dark:text-[#81C995]',
    iconBg: 'bg-[#34A853]/12 text-[#1E8E3E] dark:bg-[#81C995]/15 dark:text-[#81C995]',
    pillLabel: 'OK',
  },
  caution: {
    card: 'border-[#FBBC05]/35 bg-white/95 dark:border-[#FDD663]/20 dark:bg-[#1E1F20]/95',
    pill: 'bg-[#FBBC05]/18 text-[#9A6700] dark:bg-[#FDD663]/15 dark:text-[#FDD663]',
    iconBg: 'bg-[#FBBC05]/18 text-[#B06000] dark:bg-[#FDD663]/15 dark:text-[#FDD663]',
    pillLabel: 'Careful',
  },
  avoid: {
    card: 'border-[#EA4335]/28 bg-white/95 dark:border-[#F28B82]/22 dark:bg-[#1E1F20]/95',
    pill: 'bg-[#EA4335]/12 text-[#C5221F] dark:bg-[#F28B82]/15 dark:text-[#F28B82]',
    iconBg: 'bg-[#EA4335]/12 text-[#C5221F] dark:bg-[#F28B82]/15 dark:text-[#F28B82]',
    pillLabel: 'Avoid',
  },
  unknown: {
    card: 'border-[#4285F4]/25 bg-white/95 dark:border-[#8AB4F8]/20 dark:bg-[#1E1F20]/95',
    pill: 'bg-[#4285F4]/12 text-[#1A73E8] dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]',
    iconBg: 'bg-[#4285F4]/12 text-[#1A73E8] dark:bg-[#8AB4F8]/15 dark:text-[#8AB4F8]',
    pillLabel: 'Check',
  },
};

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
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
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
                'cloud-card flex flex-col justify-between gap-2.5 rounded-3xl border p-4 backdrop-blur-sm',
                style.card,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-2xl',
                    style.iconBg,
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    style.pill,
                  )}
                >
                  {style.pillLabel}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
                  {item.label}
                </p>
                <p className="font-display mt-0.5 text-sm font-bold leading-snug text-[#202124] dark:text-[#E3E3E3]">
                  {item.verdict}
                </p>
                <p className="mt-1 text-[11px] leading-snug text-[#5F6368] dark:text-[#9AA0A6]">
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
