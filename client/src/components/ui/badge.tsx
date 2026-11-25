import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight',
  {
    variants: {
      variant: {
        default:
          'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/25',
        neutral:
          'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
        warning:
          'bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25',
        danger:
          'bg-red-500/12 text-red-700 ring-1 ring-red-500/25 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-400/30',
        outline:
          'border border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300',
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
