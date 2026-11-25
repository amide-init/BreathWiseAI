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
  good: 'border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/35',
  caution: 'border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/35',
  unhealthy: 'border-red-200/80 bg-red-50/70 dark:border-red-900/60 dark:bg-red-950/35',
  unknown: 'border-zinc-200/80 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/70',
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/60 p-3 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{config.title}</h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {config.friendlySubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close explanation"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Reading Box */}
        <div className={cn('mb-4 rounded-xl border p-3.5', TONE_SURFACE_CLASS[evaluation.tone])}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Right Now in {selectedLocation.city}
              </p>
              <p className="font-display mt-0.5 text-xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
                {displayValue}
              </p>
            </div>
            <Badge variant={TONE_BADGE_VARIANT[evaluation.tone]}>{evaluation.badge}</Badge>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
            {evaluation.plainMeaning}
          </p>
        </div>

        {/* Plain English Explanation */}
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              What is it in plain English?
            </h3>
            <p className="mt-1 leading-relaxed text-zinc-700 dark:text-zinc-300">
              {config.whatIsIt}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              How it affects you &amp; your family
            </h3>
            <ul className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
              {config.whyItMatters.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-950/60">
            <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Simple steps you can take
            </h3>
            <ul className="mt-1.5 space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
              {config.whatYouCanDo.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Reference: {config.sourceNote}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
          <Button type="button" variant="secondary" size="sm" onClick={handleAskAi}>
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            Ask BreatheWise AI
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={onClose}>
            Got it
          </Button>
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
          'inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-emerald-500/12 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:text-zinc-500 dark:hover:bg-emerald-400/15 dark:hover:text-emerald-300',
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
