import { CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { useEffect } from 'react';

import { RECOMMENDATION_CATEGORY_META } from '@/components/planner/recommendation-meta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { RecommendationItem } from '@/types';

export function RecommendationDetailModal({
  item,
  completed,
  onToggle,
  onClose,
}: {
  item: RecommendationItem;
  completed?: boolean;
  onToggle?: () => void;
  onClose: () => void;
}) {
  const cat = RECOMMENDATION_CATEGORY_META[item.category];
  const Icon = cat.icon;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xl dark:border-white/[0.09] dark:bg-[#12171E]">
        <div className="flex items-start justify-between gap-3 pb-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                cat.accent,
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-[#EEF2F6]">
                {item.title}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={
                    item.priority === 'high'
                      ? 'danger'
                      : item.priority === 'medium'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {item.priority === 'high' ? 'Top Priority' : `${item.priority} priority`}
                </Badge>
                <Badge variant="outline">{cat.label}</Badge>
                {item.targetMembers.map((member) => (
                  <Badge key={member} variant="neutral">
                    {member}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close action details"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/[0.06] dark:hover:text-[#EEF2F6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-sm">
          <div className="rounded-xl border border-teal-200/80 bg-teal-50/50 p-3.5 dark:border-teal-400/20 dark:bg-teal-500/[0.06]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              Best Step Right Now
            </p>
            <p className="mt-1 leading-relaxed text-slate-900 dark:text-[#EEF2F6]">
              {item.whatToDo}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8E9AA8]">
              Honest Impact (City AQI + Home)
            </p>
            <p className="mt-1 leading-relaxed text-slate-700 dark:text-[#CBD5E1]">{item.why}</p>
          </div>

          {item.ifYouContinue ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-3.5 dark:border-amber-400/20 dark:bg-amber-500/[0.06]">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                If You Still Continue · Lower-Loss Steps
              </p>
              <p className="mt-1 leading-relaxed text-slate-800 dark:text-[#E2E8F0]">
                {item.ifYouContinue}
              </p>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/[0.07] dark:bg-white/[0.03]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8E9AA8]">
              Easy Swap / Alternative
            </p>
            <p className="mt-1 leading-relaxed text-slate-700 dark:text-[#CBD5E1]">
              {item.alternative}
            </p>
          </div>

          <p className="text-xs text-slate-500 dark:text-[#8E9AA8]">
            <span className="font-semibold text-slate-700 dark:text-[#CBD5E1]">Grounded in:</span>{' '}
            {item.supportingData}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 dark:border-white/[0.07]">
          {onToggle ? (
            <Button
              type="button"
              variant={completed ? 'secondary' : 'brand'}
              size="sm"
              onClick={onToggle}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {completed ? 'Completed ✓' : 'Mark as Done'}
            </Button>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-[#8E9AA8]">
              Estimated home guidance
            </span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
