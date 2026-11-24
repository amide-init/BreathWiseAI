import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const alertVariants = cva('flex items-start gap-3 rounded-xl border p-3.5 text-sm', {
  variants: {
    variant: {
      info: 'border-teal-200 bg-teal-50/70 text-teal-900',
      warning: 'border-amber-300 bg-amber-50 text-amber-950',
      danger: 'border-red-300 bg-red-50 text-red-950',
      neutral: 'border-slate-200 bg-slate-100 text-slate-800',
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
