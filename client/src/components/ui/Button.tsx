import { forwardRef, ReactNode } from 'react';
import { HTMLMotionProps, motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClasses = {
  primary:
    'bg-brand-gradient bg-[length:200%_200%] text-white shadow-glow hover:bg-[position:100%_50%] disabled:shadow-none',
  secondary:
    'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 dark:bg-ink-800 dark:text-ink-100 dark:ring-white/10 dark:hover:bg-ink-700',
  ghost: 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/5',
  danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_8px_24px_-8px_rgba(244,63,94,0.6)]',
};

const sizeClasses = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', loading = false, disabled, className, type = 'button', ...rest }, ref) => (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      whileHover={disabled || loading ? undefined : { y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'relative inline-flex select-none items-center justify-center rounded-xl font-semibold transition-[background-position,background-color,box-shadow,opacity] duration-500 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      )}
      {children}
    </motion.button>
  )
);
Button.displayName = 'Button';

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  label: string;
  active?: boolean;
  tone?: 'default' | 'danger';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, label, active, tone = 'default', className, type = 'button', ...rest }, ref) => (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.85 }}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
        tone === 'danger'
          ? 'text-ink-500 hover:bg-rose-50 hover:text-rose-600 dark:text-ink-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400'
          : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-white/5 dark:hover:text-white',
        active && 'bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
        className
      )}
      {...rest}
    >
      {children}
    </motion.button>
  )
);
IconButton.displayName = 'IconButton';
