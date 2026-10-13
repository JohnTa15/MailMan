import { FC } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

export const LogoMark: FC<{ className?: string; animate?: boolean }> = ({ className, animate }) => (
  <motion.div
    initial={animate ? { scale: 0.6, rotate: -12, opacity: 0 } : false}
    animate={{ scale: 1, rotate: 0, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    className={cn(
      'flex items-center justify-center rounded-2xl bg-brand-gradient bg-[length:200%_200%] text-white shadow-glow animate-gradient-pan',
      className
    )}
  >
    <svg viewBox="0 0 32 32" className="h-3/5 w-3/5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="7" width="24" height="18" rx="3.5" />
      <motion.path
        d="m6 10 10 8 10-8"
        initial={animate ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
      />
    </svg>
  </motion.div>
);
