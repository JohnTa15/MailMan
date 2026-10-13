import { FC } from 'react';
import { motion } from 'framer-motion';
import { Archive, ArchiveRestore, ArrowLeft, FileText, Forward, Mail, Paperclip, Reply, Star, Trash2 } from 'lucide-react';
import { Email } from '../../types';
import { useAppStore } from '../../store/appStore';
import { useMail } from '../../hooks/useMail';
import { cn } from '../../lib/cn';
import { formatBytes, formatFullDate, senderName } from '../../lib/format';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { EmailBody } from './EmailBody';

interface EmailViewProps {
  email: Email;
  onBack: () => void;
}

function quote(email: Email) {
  const original = email.body || email.preview;
  return `\n\nOn ${formatFullDate(email.date)}, ${senderName(email)} wrote:\n${original
    .split('\n')
    .map((l) => `> ${l}`)
    .join('\n')}`;
}

export const EmailView: FC<EmailViewProps> = ({ email, onBack }) => {
  const darkMode = useAppStore((s) => s.darkMode);
  const openCompose = useAppStore((s) => s.openCompose);
  const { toggleStar, toggleRead, archive, restore, remove } = useMail();
  const inArchive = email.folder === 'archive' || email.folder === 'trash';

  const reply = () =>
    openCompose({
      to: email.from,
      subject: email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
      body: quote(email),
    });
  const forward = () =>
    openCompose({
      subject: email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`,
      body: quote(email),
    });

  return (
    <motion.article
      key={email.id}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
      className="flex h-full min-h-0 flex-col"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-ink-200/70 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] dark:border-white/5">
        <IconButton label="Back to list" onClick={onBack} className="lg:hidden">
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <div className="flex-1" />
        <IconButton label={inArchive ? 'Move to inbox' : 'Archive'} onClick={() => (inArchive ? restore(email) : archive(email))}>
          {inArchive ? <ArchiveRestore className="h-[18px] w-[18px]" /> : <Archive className="h-[18px] w-[18px]" />}
        </IconButton>
        <IconButton label="Mark as unread" onClick={() => toggleRead(email).then(onBack)}>
          <Mail className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton label={email.folder === 'trash' ? 'Delete forever' : 'Delete'} tone="danger" onClick={() => remove(email)}>
          <Trash2 className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton label={email.isStarred ? 'Unstar' : 'Star'} onClick={() => toggleStar(email)}>
          <motion.span key={String(email.isStarred)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}>
            <Star className={cn('h-[18px] w-[18px]', email.isStarred && 'fill-amber-400 text-amber-400')} />
          </motion.span>
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 pb-28 pt-6 sm:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-2xl font-bold leading-tight tracking-tight sm:text-[1.75rem]"
          >
            {email.subject}
          </motion.h1>

          {(email.isImportant || email.labels.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {email.isImportant && <Badge variant="danger">Important</Badge>}
              {email.labels.map((label) => (
                <Badge key={label} variant="primary">
                  {label}
                </Badge>
              ))}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 flex items-start gap-3"
          >
            <Avatar name={senderName(email)} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold">{senderName(email)}</span>
                <span className="truncate text-sm text-ink-500 dark:text-ink-400">&lt;{email.from}&gt;</span>
              </div>
              <p className="truncate text-sm text-ink-500 dark:text-ink-400">to {email.to || 'me'}</p>
            </div>
            <time className="hidden shrink-0 text-xs text-ink-400 sm:block" dateTime={email.date}>
              {formatFullDate(email.date)}
            </time>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink-200/60 dark:bg-ink-900 dark:shadow-none dark:ring-white/5 sm:p-8"
          >
            <EmailBody html={email.html} text={email.body || email.preview} dark={darkMode} />
          </motion.div>

          {email.attachments.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-600 dark:text-ink-300">
                <Paperclip className="h-4 w-4" />
                {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {email.attachments.map((att, i) => (
                  <motion.a
                    key={att.id}
                    href={att.url}
                    download={att.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    whileHover={{ y: -2 }}
                    className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card ring-1 ring-ink-200/60 dark:bg-ink-900 dark:ring-white/5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{att.name}</p>
                      <p className="text-xs text-ink-500">{formatBytes(att.size)}</p>
                    </div>
                  </motion.a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <Button variant="secondary" onClick={reply}>
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button variant="secondary" onClick={forward}>
              <Forward className="h-4 w-4" />
              Forward
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
