import { FC } from 'react';
import { MailboxType } from '../../types';
import { cn } from '../../lib/cn';

type LogoProps = { className?: string };

export const GoogleLogo: FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" className={cn('h-5 w-5', className)} aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export const MicrosoftLogo: FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} aria-hidden="true">
    <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
    <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
    <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
    <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
  </svg>
);

export const YahooLogo: FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#6001D2" />
    <path fill="#fff" d="M5 7.5h2.9l1.7 4.3 1.7-4.3h2.8l-4.2 9.7H7l1.1-2.6zm11.9 3.9h-3.2l2.8-6.3H19zm-1.4.9c1 0 1.7.7 1.7 1.7s-.7 1.7-1.7 1.7-1.7-.8-1.7-1.7.8-1.7 1.7-1.7" />
  </svg>
);

export const ICloudLogo: FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#3693F3" />
    <path fill="#fff" d="M8.2 16.8a3.2 3.2 0 0 1-.4-6.4 4.3 4.3 0 0 1 8.2-1 3.7 3.7 0 0 1 .7 7.4z" />
  </svg>
);

export const ImapLogo: FC<LogoProps> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} aria-hidden="true">
    <rect width="24" height="24" rx="6" className="fill-ink-200 dark:fill-ink-700" />
    <path
      d="M6 8.5A1.5 1.5 0 0 1 7.5 7h9A1.5 1.5 0 0 1 18 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 15.5z m.7-.4 5.3 4.4 5.3-4.4"
      fill="none"
      className="stroke-ink-600 dark:stroke-ink-200"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const MailboxTypeLogo: FC<LogoProps & { type: MailboxType }> = ({ type, className }) => {
  if (type === 'gmail') return <GoogleLogo className={className} />;
  if (type === 'outlook' || type === 'ews') return <MicrosoftLogo className={className} />;
  if (type === 'yahoo') return <YahooLogo className={className} />;
  if (type === 'icloud') return <ICloudLogo className={className} />;
  return <ImapLogo className={className} />;
};
