import { FC, MouseEvent, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Archive, ArchiveRestore, MailOpen, Mail, Paperclip, Star, Trash2 } from 'lucide-react';
import { Email } from '../../types';
import { useMail } from '../../hooks/useMail';
import { cn } from '../../lib/cn';
import { formatListDate, senderName } from '../../lib/format';
import { Avatar } from '../ui/Avatar';

interface EmailRowProps {
  email: Email;
  index: number;
  selected: boolean;
  onSelect: (email: Email) => void;
}

const stop = (fn: () => void) => (e: MouseEvent) => {
  e.stopPropagation();
  fn();
};

export const EmailRow = forwardRef<HTMLDivElement, EmailRowProps>(({ email, index, selected, onSelect }, ref) => {
  const { toggleStar, toggleRead, archive, restore, remove } = useMail();
  const unread = !email.isRead;
  const inArchive = email.folder === 'archive' || email.folder === 'trash';

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.035, type: 'spring', stiffness: 380, damping: 32 } }}
      exit={{ opacity: 0, x: -60, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.25 } }}
      onClick={() => onSelect(email)}
      onKeyDown={(e: React.KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(email))}
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'group relative mx-2 my-1 flex cursor-pointer gap-3 overflow-hidden rounded-2xl px-3 py-3 outline-none transition-colors',
        selected
          ? 'bg-primary-50 ring-1 ring-primary-200 dark:bg-primary-500/10 dark:ring-primary-400/20'
          : 'hover:bg-white hover:shadow-card focus-visible:bg-white dark:hover:bg-white/[0.04] dark:hover:shadow-none dark:focus-visible:bg-white/[0.04]'
      )}
    >
      {unread && (
        <motion.span
          layoutId={`unread-${email.id}`}
          className="absolute left-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-brand-gradient"
        />
      )}

      <Avatar name={senderName(email)} size="md" className="mt-0.5" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn('truncate text-sm', unread ? 'font-bold text-ink-900 dark:text-white' : 'font-medium text-ink-700 dark:text-ink-300')}>
            {senderName(email)}
          </span>
          <span className={cn('ml-auto shrink-0 text-xs tabular-nums transition-opacity group-hover:opacity-0', unread ? 'font-semibold text-primary-600 dark:text-primary-300' : 'text-ink-400')}>
            {formatListDate(email.date)}
          </span>
        </div>
        <p className={cn('truncate text-sm', unread ? 'font-semibold text-ink-800 dark:text-ink-100' : 'text-ink-600 dark:text-ink-400')}>
          {email.subject}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="truncate text-[13px] text-ink-500 dark:text-ink-500">{email.preview}</p>
          {email.attachments.length > 0 && <Paperclip className="h-3.5 w-3.5 shrink-0 text-ink-400" />}
        </div>
      </div>

      {/* Star */}
      <motion.button
        type="button"
        aria-label={email.isStarred ? 'Unstar' : 'Star'}
        onClick={stop(() => toggleStar(email))}
        whileTap={{ scale: 0.7 }}
        className="self-end rounded-lg p-1 text-ink-300 hover:text-amber-400 dark:text-ink-600"
      >
        <motion.span
          key={String(email.isStarred)}
          initial={email.isStarred ? { scale: 0.4, rotate: -45 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 600, damping: 15 }}
          className="block"
        >
          <Star className={cn('h-4 w-4', email.isStarred && 'fill-amber-400 text-amber-400')} />
        </motion.span>
      </motion.button>

      {/* Hover actions */}
      <div className="pointer-events-none absolute right-3 top-2.5 flex translate-y-1 items-center gap-0.5 rounded-xl bg-white/95 p-0.5 opacity-0 shadow-card ring-1 ring-ink-200/70 transition-all group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 dark:bg-ink-800/95 dark:ring-white/10">
        <RowAction label={inArchive ? 'Move to inbox' : 'Archive'} onClick={stop(() => (inArchive ? restore(email) : archive(email)))}>
          {inArchive ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        </RowAction>
        <RowAction label={unread ? 'Mark as read' : 'Mark as unread'} onClick={stop(() => toggleRead(email))}>
          {unread ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
        </RowAction>
        <RowAction label={email.folder === 'trash' ? 'Delete forever' : 'Delete'} danger onClick={stop(() => remove(email))}>
          <Trash2 className="h-4 w-4" />
        </RowAction>
      </div>
    </motion.div>
  );
});
EmailRow.displayName = 'EmailRow';

const RowAction: FC<{ label: string; danger?: boolean; onClick: (e: MouseEvent) => void; children: React.ReactNode }> = ({
  label,
  danger,
  onClick,
  children,
}) => (
  <motion.button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    whileTap={{ scale: 0.85 }}
    className={cn(
      'flex h-7 w-7 items-center justify-center rounded-lg text-ink-500 dark:text-ink-300',
      danger ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15' : 'hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-white/10 dark:hover:text-white'
    )}
  >
    {children}
  </motion.button>
);
