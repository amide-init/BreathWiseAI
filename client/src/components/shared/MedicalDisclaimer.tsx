import { Info } from 'lucide-react';

import { cn } from '@/lib/cn';

export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600',
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
      <span>
        BreatheWise AI provides general environmental decision-support guidance and does not
        diagnose diseases, prescribe medication, or replace professional medical advice.
      </span>
    </p>
  );
}
