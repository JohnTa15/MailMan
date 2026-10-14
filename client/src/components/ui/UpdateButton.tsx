import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowDownToLine, RefreshCw, Sparkles } from 'lucide-react';
import { APP_VERSION, UpdateInfo, checkForUpdate, openExternal } from '../../lib/updates';
import { formatBytes } from '../../lib/format';
import { cn } from '../../lib/cn';

type State =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest' }
  | { kind: 'available'; update: UpdateInfo }
  | { kind: 'error' };

const swap = {
  initial: { opacity: 0, y: 6, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -6, filter: 'blur(2px)' },
  transition: { duration: 0.18 },
};

const CheckMark: FC = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
    <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: 'easeOut' }} />
  </svg>
);

interface UpdateButtonProps {
  /** `card` is a centered pill; `row` matches the sidebar menu items. */
  variant?: 'card' | 'row';
  /** Check once quietly on mount and only surface a newer version. */
  autoCheck?: boolean;
  className?: string;
}

export const UpdateButton: FC<UpdateButtonProps> = ({ variant = 'card', autoCheck = false, className }) => {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  const run = useCallback(async (force: boolean, quiet: boolean) => {
    clearTimeout(resetTimer.current);
    if (!quiet) setState({ kind: 'checking' });
    // Keep the spinner visible long enough to read as feedback
    const minDelay = quiet ? Promise.resolve() : new Promise((r) => setTimeout(r, 650));
    try {
      const [update] = await Promise.all([checkForUpdate(force), minDelay]);
      if (update) {
        setState({ kind: 'available', update });
      } else if (!quiet) {
        setState({ kind: 'latest' });
        resetTimer.current = setTimeout(() => setState({ kind: 'idle' }), 3500);
      }
    } catch {
      if (quiet) return;
      await minDelay;
      setState({ kind: 'error' });
      resetTimer.current = setTimeout(() => setState({ kind: 'idle' }), 3500);
    }
  }, []);

  useEffect(() => {
    if (autoCheck) run(false, true);
    return () => clearTimeout(resetTimer.current);
  }, [autoCheck, run]);

  const onClick = () => {
    if (state.kind === 'available') openExternal(state.update.downloadUrl);
    else if (state.kind !== 'checking') run(true, false);
  };

  const available = state.kind === 'available';

  const icon = (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={state.kind} {...swap} className="absolute inset-0 flex items-center justify-center">
          {state.kind === 'checking' && <RefreshCw className="h-4 w-4 animate-spin" />}
          {state.kind === 'idle' && <RefreshCw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />}
          {state.kind === 'latest' && <CheckMark />}
          {state.kind === 'error' && <AlertCircle className="h-4 w-4" />}
          {available && <ArrowDownToLine className="h-4 w-4 group-hover:animate-bounce" />}
        </motion.span>
      </AnimatePresence>
    </span>
  );

  const label = {
    idle: 'Check for updates',
    checking: 'Checking…',
    latest: "You're up to date",
    error: "Couldn't check right now",
    available: available ? `Update to v${state.update.version}` : '',
  }[state.kind];

  if (variant === 'row') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-live="polite"
        className={cn(
          'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          available
            ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/15'
            : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/5',
          state.kind === 'latest' && 'text-emerald-600 dark:text-emerald-400',
          state.kind === 'error' && 'text-rose-600 dark:text-rose-400',
          className
        )}
      >
        <span className="relative">
          {icon}
          {available && (
            <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-gradient" />
            </span>
          )}
        </span>
        <span className="relative h-5 flex-1 overflow-hidden text-left">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={label} {...swap} className="absolute inset-0 truncate">
              {label}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="rounded-md bg-ink-200/60 px-1.5 py-0.5 font-mono text-[10px] text-ink-500 dark:bg-white/10 dark:text-ink-400">
          v{APP_VERSION}
        </span>
      </button>
    );
  }

  return (
    <div className={cn('flex justify-center', className)}>
      <motion.button
        type="button"
        layout
        onClick={onClick}
        aria-live="polite"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={cn(
          'group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full py-2 pl-3 pr-2 text-xs font-semibold',
          available
            ? 'bg-brand-gradient bg-[length:200%_200%] text-white shadow-glow animate-gradient-pan'
            : 'glass text-ink-600 shadow-card hover:text-ink-900 dark:text-ink-300 dark:hover:text-white',
          state.kind === 'latest' && 'text-emerald-600 dark:text-emerald-400',
          state.kind === 'error' && 'text-rose-600 dark:text-rose-400'
        )}
      >
        {available && (
          // Light sweep across the pill
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ['0%', '400%'] }}
            transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' }}
          />
        )}
        <motion.span layout="position" className="relative flex items-center gap-2">
          {available ? <Sparkles className="h-4 w-4" /> : icon}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={label} {...swap} className="whitespace-nowrap">
              {label}
            </motion.span>
          </AnimatePresence>
        </motion.span>
        <motion.span
          layout="position"
          className={cn(
            'relative flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]',
            available ? 'bg-white/20 font-semibold text-white' : 'bg-ink-100 font-mono text-ink-500 dark:bg-white/10 dark:text-ink-400'
          )}
        >
          {available ? (
            <>
              <ArrowDownToLine className="h-3 w-3" />
              {state.update.assetSize ? formatBytes(state.update.assetSize) : 'Download'}
            </>
          ) : (
            `v${APP_VERSION}`
          )}
        </motion.span>
      </motion.button>
    </div>
  );
};
