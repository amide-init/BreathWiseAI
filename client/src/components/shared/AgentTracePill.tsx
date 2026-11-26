import { BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * Minimal collapsible pill displaying the LangGraph Planning + Tool Execution trace
 * so users can inspect how city AQI, indoor setup, and domain tools shaped their advice.
 */
export function AgentTracePill({
  trace,
  cityLabel,
  className,
}: {
  trace?: string[] | null;
  cityLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!trace || trace.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-white/[0.07] dark:bg-white/[0.025]',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-[#EEF2F6]"
      >
        <span className="flex items-center gap-2">
          <BrainCircuit
            className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400"
            aria-hidden="true"
          />
          <span>
            How BreatheWise reasoned
            {cityLabel ? ` · ${cityLabel}` : ''} ({trace.length} steps)
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <ol className="space-y-1.5 border-t border-slate-200/70 px-3 py-2.5 text-xs text-slate-600 dark:border-white/[0.06] dark:text-[#94A3B8]">
          {trace.map((step, idx) => (
            <li key={`${idx}-${step.slice(0, 24)}`} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-500/12 text-[10px] font-semibold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
