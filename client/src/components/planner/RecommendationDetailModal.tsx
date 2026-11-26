import { CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { useEffect } from 'react';

import { RECOMMENDATION_CATEGORY_META } from '@/components/planner/recommendation-meta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/modal-portal';
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
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-3 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="cloud-card max-h-[88vh] w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white dark:border-white/[0.1] dark:bg-[#1E1F20]">
        <div className="google-ribbon h-[3px] w-full" aria-hidden="true" />
        <div className="max-h-[85vh] overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3 pb-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                  cat.accent,
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-[#202124] dark:text-[#E3E3E3]">
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
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:bg-white/[0.08] dark:hover:text-[#E3E3E3]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="rounded-2xl border border-[#4285F4]/25 bg-[#4285F4]/[0.07] p-3.5 dark:border-[#8AB4F8]/25 dark:bg-[#4285F4]/[0.1]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#1A73E8] dark:text-[#8AB4F8]">
                Best Step Right Now
              </p>
              <p className="mt-1 leading-relaxed text-[#202124] dark:text-[#E3E3E3]">
                {item.whatToDo}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#5F6368] dark:text-[#9AA0A6]">
                Honest Impact (City AQI + Home)
              </p>
              <p className="mt-1 leading-relaxed text-[#3C4043] dark:text-[#BDC1C6]">{item.why}</p>
            </div>

            {item.ifYouContinue ? (
              <div className="rounded-2xl border border-[#FBBC05]/40 bg-[#FBBC05]/[0.1] p-3.5 dark:border-[#FDD663]/25 dark:bg-[#FBBC05]/[0.1]">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#9A6700] dark:text-[#FDD663]">
                  <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  If You Still Continue · Lower-Loss Steps
                </p>
                <p className="mt-1 leading-relaxed text-[#202124] dark:text-[#E3E3E3]">
                  {item.ifYouContinue}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[#34A853]/25 bg-[#34A853]/[0.06] p-3.5 dark:border-[#81C995]/20 dark:bg-[#34A853]/[0.08]">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#1E8E3E] dark:text-[#81C995]">
                Easy Swap / Alternative
              </p>
              <p className="mt-1 leading-relaxed text-[#3C4043] dark:text-[#E3E3E3]">
                {item.alternative}
              </p>
            </div>

            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              <span className="font-semibold text-[#3C4043] dark:text-[#BDC1C6]">Grounded in:</span>{' '}
              {item.supportingData}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#E8EAED] pt-3.5 dark:border-white/[0.08]">
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
              <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                Estimated home guidance
              </span>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
