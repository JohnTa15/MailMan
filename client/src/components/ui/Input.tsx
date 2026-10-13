import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  icon?: ReactNode;
  trailing?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ value, onChange, icon, trailing, className, wrapperClassName, type = 'text', ...rest }, ref) => (
    <div className={cn('group relative', wrapperClassName)}>
      {icon && (
        <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 transition-colors group-focus-within:text-primary-500">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-11 w-full rounded-xl border border-ink-200 bg-white/80 px-4 text-sm text-ink-900 placeholder-ink-400 shadow-sm outline-none transition-all',
          'focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/15',
          'dark:border-white/10 dark:bg-ink-900/60 dark:text-white dark:placeholder-ink-500 dark:focus:border-primary-400/70 dark:focus:bg-ink-900',
          'disabled:cursor-not-allowed disabled:opacity-60',
          icon && 'pl-10',
          trailing && 'pr-11',
          className
        )}
        {...rest}
      />
      {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
    </div>
  )
);
Input.displayName = 'Input';
