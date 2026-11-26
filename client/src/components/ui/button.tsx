import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4285F4]/60 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-[#4285F4] text-white shadow-[0_2px_0_#1A73E8] hover:bg-[#3367D6] dark:bg-[#8AB4F8] dark:text-[#131314] dark:shadow-none dark:hover:bg-[#A8C7FA]',
        brand:
          'bg-[#34A853] text-white shadow-[0_2px_0_#1E8E3E] hover:bg-[#2E9448] dark:bg-[#81C995] dark:text-[#131314] dark:shadow-none dark:hover:bg-[#9BD8AC]',
        secondary:
          'bg-[#F1F3F4] text-[#202124] hover:bg-[#E8EAED] dark:bg-[#282A2C] dark:text-[#E3E3E3] dark:hover:bg-[#35373A]',
        outline:
          'border border-[#DADCE0] bg-white text-[#3C4043] hover:border-[#4285F4]/50 hover:bg-[#4285F4]/[0.05] dark:border-white/[0.12] dark:bg-[#1E1F20] dark:text-[#E3E3E3] dark:hover:border-[#8AB4F8]/45 dark:hover:bg-[#282A2C]',
        ghost:
          'text-[#5F6368] hover:bg-[#F1F3F4] hover:text-[#202124] dark:text-[#9AA0A6] dark:hover:bg-white/[0.06] dark:hover:text-[#E3E3E3]',
        danger:
          'border border-[#EA4335]/30 bg-[#EA4335]/10 text-[#C5221F] hover:bg-[#EA4335]/15 dark:border-[#F28B82]/30 dark:bg-[#EA4335]/15 dark:text-[#F28B82] dark:hover:bg-[#EA4335]/20',
      },
      size: {
        default: 'px-4 py-2',
        sm: 'min-h-[34px] px-3.5 py-1.5 text-xs',
        lg: 'px-6 py-2.5 text-sm',
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
