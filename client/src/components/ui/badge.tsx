import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight',
  {
    variants: {
      variant: {
        default:
          'bg-[#34A853]/12 text-[#1E8E3E] ring-1 ring-[#34A853]/25 dark:bg-[#81C995]/15 dark:text-[#81C995] dark:ring-[#81C995]/25',
        neutral:
          'bg-[#F1F3F4] text-[#5F6368] dark:bg-white/[0.08] dark:text-[#BDC1C6]',
        warning:
          'bg-[#FBBC05]/18 text-[#9A6700] ring-1 ring-[#FBBC05]/35 dark:bg-[#FDD663]/15 dark:text-[#FDD663] dark:ring-[#FDD663]/25',
        danger:
          'bg-[#EA4335]/12 text-[#C5221F] ring-1 ring-[#EA4335]/25 dark:bg-[#F28B82]/15 dark:text-[#F28B82] dark:ring-[#F28B82]/25',
        outline:
          'border border-[#DADCE0] text-[#5F6368] dark:border-white/[0.12] dark:text-[#BDC1C6]',
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
