import { CheckCircle2, X } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 p-3 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
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
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{item.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              What to do
            </p>
            <p className="mt-1 leading-relaxed text-zinc-900 dark:text-zinc-100">{item.whatToDo}</p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Why it matters for you
            </p>
            <p className="mt-1 leading-relaxed text-zinc-700 dark:text-zinc-300">{item.why}</p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Easy Backup / Swap
            </p>
            <p className="mt-1 leading-relaxed text-zinc-700 dark:text-zinc-300">
              {item.alternative}
            </p>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Based on:</span>{' '}
            {item.supportingData}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
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
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
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
