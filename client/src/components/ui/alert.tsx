import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const alertVariants = cva('flex items-start gap-3 rounded-xl border p-3.5 text-sm', {
  variants: {
    variant: {
      info: 'border-teal-200/80 bg-teal-50/60 text-teal-950 dark:border-teal-400/20 dark:bg-teal-500/[0.07] dark:text-teal-100',
      warning:
        'border-amber-200/90 bg-amber-50/70 text-amber-950 dark:border-amber-400/20 dark:bg-amber-500/[0.07] dark:text-amber-100',
      danger:
        'border-rose-200/90 bg-rose-50/70 text-rose-950 dark:border-rose-400/25 dark:bg-rose-500/[0.09] dark:text-rose-100',
      neutral:
        'border-slate-200/80 bg-slate-50/80 text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-[#CBD5E1]',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
});

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
