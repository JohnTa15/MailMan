import { FC } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { cn } from '../../lib/cn';

export const ThemeToggle: FC<{ className?: string; showLabel?: boolean }> = ({ className, showLabel }) => {
  const darkMode = useAppStore((s) => s.darkMode);
  const setDarkMode = useAppStore((s) => s.setDarkMode);

  return (
    <button
      type="button"
      onClick={() => setDarkMode(!darkMode)}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-white/5',
        className
      )}
    >
      <span className="relative h-5 w-5">
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={darkMode ? 'moon' : 'sun'}
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </motion.span>
        </AnimatePresence>
      </span>
      {showLabel && <span>{darkMode ? 'Dark mode' : 'Light mode'}</span>}
    </button>
  );
};
