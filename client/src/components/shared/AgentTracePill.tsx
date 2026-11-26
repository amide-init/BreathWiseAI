import { BrainCircuit, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * Minimal collapsible Google-styled pill displaying the LangGraph Planning + Tool trace.
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
        'rounded-2xl border border-[#4285F4]/25 bg-[#4285F4]/[0.05] dark:border-[#8AB4F8]/20 dark:bg-[#282A2C]/80',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-left text-xs font-semibold text-[#1A73E8] transition-colors hover:opacity-85 dark:text-[#8AB4F8]"
      >
        <span className="flex items-center gap-2">
          <BrainCircuit className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
        <ol className="space-y-1.5 border-t border-[#4285F4]/15 px-3.5 py-2.5 text-xs text-[#3C4043] dark:border-white/[0.08] dark:text-[#BDC1C6]">
          {trace.map((step, idx) => (
            <li key={`${idx}-${step.slice(0, 24)}`} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4285F4]/15 text-[10px] font-bold text-[#1A73E8] dark:bg-[#8AB4F8]/20 dark:text-[#8AB4F8]">
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
