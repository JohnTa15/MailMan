import { FC } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';

/**
 * Mailman primary logo mark — based on the "Tinted" app icon variant.
 * Envelope body forms an "M" via the flap chevron, with a circular
 * notification dot near the top-right corner.
 *
 * Renders in currentColor so it inherits text color from its parent.
 * Pass `variant="light"` for white-on-dark or `variant="dark"` for
 * dark-on-light contexts.
 */
export const LogoMark: FC<{
  className?: string;
  animate?: boolean;
  variant?: 'light' | 'dark' | 'tinted';
}> = ({ className, animate, variant = 'tinted' }) => {
  const colors = {
    light: { bg: '#3B82F6', stroke: '#FFFFFF', dot: '#FACC15' },
    dark: { bg: '#0F172A', stroke: '#FFFFFF', dot: '#FACC15' },
    tinted: { bg: '#1C1C1E', stroke: '#8E8E93', dot: '#AEAEB2' },
  }[variant];

  return (
    <motion.div
      initial={animate ? { scale: 0.6, rotate: -12, opacity: 0 } : false}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className={cn(
        'flex items-center justify-center rounded-[22.5%] shadow-lg',
        className
      )}
      style={{ backgroundColor: colors.bg }}
    >
      <svg
        viewBox="0 0 128 128"
        className="h-3/5 w-3/5"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Envelope body with rounded corners */}
        <rect
          x="16"
          y="28"
          width="96"
          height="72"
          rx="14"
          stroke={colors.stroke}
          strokeWidth="7"
          strokeLinejoin="round"
        />
        {/* M-shaped flap chevron */}
        <motion.path
          d="M24 38 L64 70 L104 38"
          stroke={colors.stroke}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
        />
        {/* Notification dot */}
        <circle cx="104" cy="28" r="10" fill={colors.dot} />
      </svg>
    </motion.div>
  );
};

/** Inline monochrome version for nav bars, buttons, etc. */
export const LogoInline: FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 128 128"
    className={cn('h-6 w-6', className)}
    fill="none"
    stroke="currentColor"
    strokeWidth="7"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="16" y="28" width="96" height="72" rx="14" />
    <path d="M24 38 L64 70 L104 38" />
    <circle cx="104" cy="28" r="10" fill="currentColor" stroke="none" />
  </svg>
);
