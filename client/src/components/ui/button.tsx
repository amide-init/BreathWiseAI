import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.99]',
  {
    variants: {
      variant: {
        primary:
          'bg-slate-900 text-white shadow-xs hover:bg-slate-800 dark:bg-[#EEF2F6] dark:text-[#0B0E12] dark:hover:bg-white',
        brand:
          'bg-teal-600 text-white shadow-xs hover:bg-teal-700 dark:bg-teal-400/90 dark:text-[#0B0E12] dark:hover:bg-teal-300',
        secondary:
          'bg-slate-100 text-slate-800 hover:bg-slate-200/80 dark:bg-[#1A212B] dark:text-[#D9E2EC] dark:hover:bg-[#232C38]',
        outline:
          'border border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.09] dark:bg-[#12171E] dark:text-[#D9E2EC] dark:hover:border-white/[0.16] dark:hover:bg-[#1A212B]',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:bg-white/[0.06] dark:hover:text-[#EEF2F6]',
        danger:
          'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/15',
      },
      size: {
        default: 'px-4 py-2',
        sm: 'min-h-[34px] px-3 py-1.5 text-xs',
        lg: 'px-5 py-2.5 text-sm font-semibold',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
