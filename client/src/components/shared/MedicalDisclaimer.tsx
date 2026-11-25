import { Info } from 'lucide-react';

import { cn } from '@/lib/cn';

export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-xl border border-zinc-200/80 bg-zinc-100/70 px-3.5 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400',
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
      <span>
        BreatheWise AI provides general environmental decision-support guidance and does not
        diagnose diseases, prescribe medication, or replace professional medical advice.
      </span>
    </p>
  );
}
