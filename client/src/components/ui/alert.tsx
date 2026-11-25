import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const alertVariants = cva('flex items-start gap-3 rounded-xl border p-3.5 text-sm', {
  variants: {
    variant: {
      info: 'border-emerald-200/80 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-200',
      warning:
        'border-amber-300/80 bg-amber-50/80 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/35 dark:text-amber-200',
      danger:
        'border-red-300/80 bg-red-50/80 text-red-950 dark:border-red-800/60 dark:bg-red-950/35 dark:text-red-200',
      neutral:
        'border-zinc-200/90 bg-zinc-100/80 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
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
