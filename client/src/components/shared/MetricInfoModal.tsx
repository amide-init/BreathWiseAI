import { CheckCircle2, Info, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  METRIC_EXPLAINERS,
  type MetricKey,
  type MetricLevelTone,
} from '@/config/metric-explainers';
import { APP_ROUTES } from '@/config/routes';
import { useSelectedLocation } from '@/hooks/useSelectedLocation';
import { cn } from '@/lib/cn';

const TONE_BADGE_VARIANT: Record<MetricLevelTone, 'default' | 'warning' | 'danger' | 'neutral'> = {
  good: 'default',
  caution: 'warning',
  unhealthy: 'danger',
  unknown: 'neutral',
};

const TONE_SURFACE_CLASS: Record<MetricLevelTone, string> = {
  good: 'border-[#34A853]/35 bg-[#E6F4EA]/75 dark:border-[#81C995]/30 dark:bg-[#34A853]/12',
  caution: 'border-[#FBBC05]/45 bg-[#FEF7E0]/80 dark:border-[#FDD663]/30 dark:bg-[#FBBC05]/12',
  unhealthy: 'border-[#EA4335]/35 bg-[#FCE8E6]/80 dark:border-[#F28B82]/30 dark:bg-[#EA4335]/12',
  unknown: 'border-[#E8EAED] bg-[#F8F9FA] dark:border-white/[0.1] dark:bg-[#131314]/80',
};

export interface MetricInfoModalProps {
  metricKey: MetricKey;
  currentValue?: number | string | null;
  formattedValue?: string;
  onClose: () => void;
}

export function MetricInfoModal({
  metricKey,
  currentValue,
  formattedValue,
  onClose,
}: MetricInfoModalProps) {
  const navigate = useNavigate();
  const { selectedLocation } = useSelectedLocation();
  const config = METRIC_EXPLAINERS[metricKey];
  const evaluation = config.evaluateValue(currentValue);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const displayValue =
    formattedValue ??
    (currentValue !== null && currentValue !== undefined && currentValue !== ''
      ? `${currentValue}${config.unit ? ` ${config.unit}` : ''}`
      : 'Unavailable');

  function handleAskAi() {
    const prompt = config.askAiPrompt(displayValue, selectedLocation.city);
    onClose();
    navigate(`${APP_ROUTES.ASSISTANT}?q=${encodeURIComponent(prompt)}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="cloud-card max-h-[88vh] w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white dark:border-white/[0.1] dark:bg-[#1E1F20]">
        <div className="google-ribbon h-[3px] w-full" aria-hidden="true" />
        <div className="max-h-[calc(88vh-3px)] overflow-y-auto p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3">
          <div>
            <h2 className="font-display text-lg font-bold text-[#202124] dark:text-[#E3E3E3]">
              {config.title}
            </h2>
            <p className="mt-0.5 text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              {config.friendlySubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close explanation"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:bg-white/[0.08] dark:hover:text-[#E3E3E3]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Reading Box */}
        <div className={cn('mb-4 rounded-2xl border p-3.5', TONE_SURFACE_CLASS[evaluation.tone])}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5F6368] dark:text-[#9AA0A6]">
                Right Now in {selectedLocation.city}
              </p>
              <p className="font-display mt-0.5 text-xl font-bold tabular-nums text-[#202124] dark:text-[#E3E3E3]">
                {displayValue}
              </p>
            </div>
            <Badge variant={TONE_BADGE_VARIANT[evaluation.tone]}>{evaluation.badge}</Badge>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#3C4043] dark:text-[#C4C7C5]">
            {evaluation.plainMeaning}
          </p>
        </div>

        {/* Plain English Explanation */}
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#5F6368] dark:text-[#9AA0A6]">
              What is it in plain English?
            </h3>
            <p className="mt-1 leading-relaxed text-[#3C4043] dark:text-[#C4C7C5]">
              {config.whatIsIt}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#5F6368] dark:text-[#9AA0A6]">
              How it affects you &amp; your family
            </h3>
            <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-[#3C4043] dark:text-[#C4C7C5]">
              {config.whyItMatters.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4285F4]"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#34A853]/25 bg-[#E6F4EA]/55 p-3.5 dark:border-[#81C995]/20 dark:bg-[#34A853]/10">
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#137333] dark:text-[#81C995]">
              Simple steps you can take
            </h3>
            <ul className="mt-1.5 space-y-1.5 text-xs text-[#3C4043] dark:text-[#C4C7C5]">
              {config.whatYouCanDo.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#34A853] dark:text-[#81C995]"
                    aria-hidden="true"
                  />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
            Reference: {config.sourceNote}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#E8EAED] pt-3.5 dark:border-white/[0.08]">
          <Button type="button" variant="secondary" size="sm" onClick={handleAskAi}>
            <Sparkles className="h-3.5 w-3.5 text-[#4285F4] dark:text-[#8AB4F8]" />
            Ask BreatheWise AI
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Got it
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable clickable `(i)` info icon that opens the MetricInfoModal for any metric.
 */
export function MetricInfoButton({
  metricKey,
  currentValue,
  formattedValue,
  className,
}: {
  metricKey: MetricKey;
  currentValue?: number | string | null;
  formattedValue?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const config = METRIC_EXPLAINERS[metricKey];

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        title={`What is ${config.title}?`}
        aria-label={`Learn about ${config.title}`}
        className={cn(
          'inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#5F6368] transition-colors hover:bg-[#4285F4]/12 hover:text-[#1A73E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/50 dark:text-[#9AA0A6] dark:hover:bg-[#8AB4F8]/15 dark:hover:text-[#8AB4F8]',
          className,
        )}
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {open ? (
        <MetricInfoModal
          metricKey={metricKey}
          currentValue={currentValue}
          formattedValue={formattedValue}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
