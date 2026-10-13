import { FC, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantClasses = {
  default: 'bg-ink-100 text-ink-600 dark:bg-white/10 dark:text-ink-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export const Badge: FC<BadgeProps> = ({ children, variant = 'default', className }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize tracking-wide',
      variantClasses[variant],
      className
    )}
  >
    {children}
  </span>
);
