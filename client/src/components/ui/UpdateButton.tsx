import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowDownToLine, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  APP_VERSION,
  UpdateInfo,
  checkForUpdate,
  currentPlatform,
  desktopUpdater,
  installAndroidUpdate,
  openExternal,
} from '../../lib/updates';
import { formatBytes } from '../../lib/format';
import { cn } from '../../lib/cn';

type State =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest' }
  | { kind: 'available'; update: UpdateInfo }
  /** Built-in updates: downloading inside the app */
  | { kind: 'downloading'; version: string; percent: number }
  /** Windows: downloaded, installs on restart */
  | { kind: 'ready'; version: string }
  /** Android: the system installer is open */
  | { kind: 'installing'; version: string }
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

  // Windows: the app's own updater checks and downloads in the background
  const desktop = desktopUpdater();
  const [builtIn, setBuiltIn] = useState(false);
  useEffect(() => {
    if (!desktop) return;
    const apply = (s: DesktopUpdateState, quiet: boolean) => {
      clearTimeout(resetTimer.current);
      if (s.status === 'unsupported') return;
      setBuiltIn(true);
      if (s.status === 'downloading') setState({ kind: 'downloading', version: s.version || '', percent: s.percent || 0 });
      else if (s.status === 'ready') setState({ kind: 'ready', version: s.version || '' });
      else if (s.status === 'checking') !quiet && setState({ kind: 'checking' });
      else if (s.status === 'latest' || s.status === 'error') {
        if (quiet) return setState({ kind: 'idle' });
        setState({ kind: s.status });
        resetTimer.current = setTimeout(() => setState({ kind: 'idle' }), 3500);
      }
    };
    desktop.state().then((s) => apply(s, true));
    return desktop.onState((s) => apply(s, false));
  }, [desktop]);

  useEffect(() => {
    if (autoCheck && !desktop) run(false, true);
    return () => clearTimeout(resetTimer.current);
  }, [autoCheck, run, desktop]);

  const installOnAndroid = async (update: UpdateInfo) => {
    setState({ kind: 'downloading', version: update.version, percent: 0 });
    try {
      await installAndroidUpdate(update.downloadUrl, (percent) =>
        setState({ kind: 'downloading', version: update.version, percent })
      );
      setState({ kind: 'installing', version: update.version });
      // If the installer is dismissed, offer the update again
      resetTimer.current = setTimeout(() => setState({ kind: 'available', update }), 8000);
    } catch (err) {
      const code = (err as { code?: string }).code;
      setState({ kind: 'available', update });
      if (code === 'PERMISSION_NEEDED') {
        toast('Allow Mailman to install updates, then tap Update again.', { icon: '🔐', id: 'update' });
      } else if (code === 'SIGNATURE_MISMATCH') {
        toast.error('This update needs a one-time manual install. Opening the download…', { id: 'update' });
        openExternal(update.downloadUrl);
      } else {
        toast.error((err as Error).message || 'The update could not be downloaded', { id: 'update' });
      }
    }
  };

  const onClick = () => {
    if (builtIn && desktop) {
      if (state.kind === 'ready') void desktop.install();
      else if (state.kind !== 'checking' && state.kind !== 'downloading') {
        setState({ kind: 'checking' });
        void desktop.check();
      }
      return;
    }
    if (state.kind === 'available') {
      if (currentPlatform() === 'android' && /\.apk$/i.test(state.update.downloadUrl)) void installOnAndroid(state.update);
      else openExternal(state.update.downloadUrl);
    } else if (state.kind !== 'checking' && state.kind !== 'downloading' && state.kind !== 'installing') run(true, false);
  };

  const available = state.kind === 'available' || state.kind === 'ready';
  const busy = state.kind === 'downloading' || state.kind === 'installing';

  const icon = (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={state.kind} {...swap} className="absolute inset-0 flex items-center justify-center">
          {state.kind === 'checking' && <RefreshCw className="h-4 w-4 animate-spin" />}
          {state.kind === 'idle' && <RefreshCw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />}
          {state.kind === 'latest' && <CheckMark />}
          {state.kind === 'error' && <AlertCircle className="h-4 w-4" />}
          {available && <ArrowDownToLine className="h-4 w-4 group-hover:animate-bounce" />}
          {busy && <ArrowDownToLine className="h-4 w-4 animate-pulse" />}
        </motion.span>
      </AnimatePresence>
    </span>
  );

  const label = {
    idle: 'Check for updates',
    checking: 'Checking…',
    latest: "You're up to date",
    error: "Couldn't check right now",
    available: state.kind === 'available' ? `Update to v${state.update.version}` : '',
    downloading: state.kind === 'downloading' ? `Downloading v${state.version}… ${state.percent}%` : '',
    ready: state.kind === 'ready' ? `Restart to update to v${state.version}` : '',
    installing: 'Opening the installer…',
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
        {state.kind === 'downloading' && (
          <motion.span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand-gradient"
            animate={{ scaleX: state.percent / 100 }}
            transition={{ ease: 'easeOut' }}
          />
        )}
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
          {state.kind === 'available' ? (
            <>
              <ArrowDownToLine className="h-3 w-3" />
              {state.update.assetSize ? formatBytes(state.update.assetSize) : 'Download'}
            </>
          ) : state.kind === 'ready' ? (
            'Restart'
          ) : state.kind === 'downloading' ? (
            `${state.percent}%`
          ) : (
            `v${APP_VERSION}`
          )}
        </motion.span>
      </motion.button>
    </div>
  );
};
