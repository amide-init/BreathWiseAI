import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight',
  {
    variants: {
      variant: {
        default:
          'bg-teal-500/10 text-teal-700 ring-1 ring-teal-500/20 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/20',
        neutral:
          'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-[#94A3B8]',
        warning:
          'bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
        danger:
          'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:bg-rose-400/12 dark:text-rose-300 dark:ring-rose-400/25',
        outline:
          'border border-slate-200 text-slate-600 dark:border-white/[0.1] dark:text-[#94A3B8]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
