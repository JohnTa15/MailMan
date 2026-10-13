import { FC, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Inbox, Menu, RefreshCw, Search, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { selectVisibleEmails, useAppStore } from '../../store/appStore';
import { useMail } from '../../hooks/useMail';
import { Email } from '../../types';
import { cn } from '../../lib/cn';
import { EmailRow } from './EmailRow';
import { FOLDERS } from '../layout/Sidebar';
import { IconButton } from '../ui/Button';
import { Input } from '../ui/Input';

interface EmailListProps {
  onSelect: (email: Email) => void;
  className?: string;
}

const EMPTY_COPY: Record<string, { title: string; text: string }> = {
  inbox: { title: 'Inbox zero 🎉', text: "You're all caught up. Enjoy the calm." },
  starred: { title: 'No starred mail', text: 'Star messages to find them here quickly.' },
  important: { title: 'Nothing important', text: 'Messages marked important will show up here.' },
  sent: { title: 'Nothing sent yet', text: 'Messages you send will appear here.' },
  drafts: { title: 'No drafts', text: 'Drafts you save will appear here.' },
  archive: { title: 'Archive is empty', text: 'Archive messages to tidy your inbox.' },
  trash: { title: 'Trash is empty', text: 'Deleted messages land here first.' },
};

export const EmailList: FC<EmailListProps> = ({ onSelect, className }) => {
  const { emails: all, selectedFolder, searchQuery } = useAppStore(
    useShallow((s) => ({ emails: s.emails, selectedFolder: s.selectedFolder, searchQuery: s.searchQuery }))
  );
  const isLoading = useAppStore((s) => s.isLoading);
  const selectedEmailId = useAppStore((s) => s.selectedEmailId);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const { refresh } = useMail();

  const emails = useMemo(
    () => selectVisibleEmails({ emails: all, selectedFolder, searchQuery }),
    [all, selectedFolder, searchQuery]
  );
  const unread = emails.filter((e) => !e.isRead).length;
  const folder = FOLDERS.find((f) => f.id === selectedFolder);
  const empty = searchQuery
    ? { title: 'No matches', text: `Nothing found for “${searchQuery}”.` }
    : EMPTY_COPY[selectedFolder];

  return (
    <section className={cn('flex h-full min-h-0 flex-col', className)} aria-label="Messages">
      <header className="space-y-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <IconButton label="Open menu" className="-ml-1 lg:hidden" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-5 w-5" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h1
                key={selectedFolder}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="text-2xl font-bold tracking-tight"
              >
                {folder?.label}
              </motion.h1>
            </AnimatePresence>
            <p className="text-xs font-medium text-ink-500 dark:text-ink-400">
              {emails.length} message{emails.length === 1 ? '' : 's'}
              {unread > 0 && <span className="text-primary-600 dark:text-primary-300"> · {unread} unread</span>}
            </p>
          </div>
          <IconButton label="Refresh" onClick={() => refresh({ sync: true })} disabled={isLoading}>
            <RefreshCw className={cn('h-[18px] w-[18px]', isLoading && 'animate-spin')} />
          </IconButton>
        </div>
        <Input
          type="search"
          aria-label="Search mail"
          placeholder="Search mail"
          value={searchQuery}
          onChange={setSearchQuery}
          icon={<Search className="h-4 w-4" />}
          className="h-10"
          trailing={
            searchQuery && (
              <IconButton label="Clear search" className="h-8 w-8" onClick={() => setSearchQuery('')}>
                <X className="h-4 w-4" />
              </IconButton>
            )
          }
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-24 lg:pb-4">
        {isLoading && emails.length === 0 ? (
          <div className="space-y-1 px-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-3 py-3" style={{ opacity: 1 - i * 0.12 }}>
                <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-3 w-4/5" />
                  <div className="skeleton h-3 w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <motion.div
            key={`${selectedFolder}-${searchQuery}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center px-8 pt-20 text-center"
          >
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-3xl bg-brand-gradient opacity-30 blur-2xl" />
              <div className="glass relative flex h-20 w-20 animate-float items-center justify-center rounded-3xl text-primary-500">
                {folder ? <folder.icon className="h-9 w-9" /> : <Inbox className="h-9 w-9" />}
              </div>
            </div>
            <p className="text-lg font-semibold">{empty?.title}</p>
            <p className="mt-1 max-w-xs text-sm text-ink-500 dark:text-ink-400">{empty?.text}</p>
          </motion.div>
        ) : (
          <AnimatePresence initial={true} mode="popLayout">
            {emails.map((email, i) => (
              <EmailRow
                key={email.id}
                email={email}
                index={i}
                selected={email.id === selectedEmailId}
                onSelect={onSelect}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
};
