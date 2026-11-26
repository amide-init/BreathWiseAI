import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const alertVariants = cva('flex items-start gap-3 rounded-2xl border p-3.5 text-sm', {
  variants: {
    variant: {
      info: 'border-[#4285F4]/25 bg-[#4285F4]/[0.07] text-[#174EA6] dark:border-[#8AB4F8]/25 dark:bg-[#4285F4]/[0.11] dark:text-[#D2E3FC]',
      warning:
        'border-[#FBBC05]/35 bg-[#FBBC05]/[0.10] text-[#7A4F01] dark:border-[#FDD663]/25 dark:bg-[#FBBC05]/[0.10] dark:text-[#FEEFC3]',
      danger:
        'border-[#EA4335]/30 bg-[#EA4335]/[0.08] text-[#A50E0E] dark:border-[#F28B82]/30 dark:bg-[#EA4335]/[0.12] dark:text-[#FAD2CF]',
      neutral:
        'border-[#DADCE0] bg-[#F1F3F4]/80 text-[#3C4043] dark:border-white/[0.09] dark:bg-[#282A2C] dark:text-[#E3E3E3]',
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
