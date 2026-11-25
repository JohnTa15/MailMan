import { FC } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/** The two halves of the "Fold" mark: an envelope folded into an M. */
const LEFT = 'M26 38 L62 66.4 V92 H32 a6 6 0 0 1 -6 -6 Z';
const RIGHT = 'M102 38 L66 66.4 V92 H96 a6 6 0 0 0 6 -6 Z';

/**
 * Mailman app icon, the same artwork as the favicon, the Windows icon and
 * the Android launcher icon (source: branding/icon.svg). With `animate`,
 * the two halves fold in from the sides.
 */
export const LogoMark: FC<{ className?: string; animate?: boolean }> = ({ className, animate }) => (
  <motion.div
    initial={animate ? { scale: 0.7, opacity: 0 } : false}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    className={cn('overflow-hidden rounded-[22%] shadow-lg ring-1 ring-black/5 dark:ring-white/10', className)}
  >
    <svg viewBox="0 0 128 128" className="h-full w-full" role="img" aria-label="Mailman">
      <rect width="128" height="128" fill="#111827" />
      <motion.path
        d={LEFT}
        fill="#818CF8"
        initial={animate ? { x: -28, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 18 }}
      />
      <motion.path
        d={RIGHT}
        fill="#F472B6"
        initial={animate ? { x: 28, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 18 }}
      />
    </svg>
  </motion.div>
);

/** One-colour mark for toolbars and buttons; takes the text colour. */
export const LogoInline: FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 128 128" className={cn('h-6 w-6', className)} fill="currentColor" aria-hidden="true">
    <path d={LEFT} />
    <path d={RIGHT} />
  </svg>
);
