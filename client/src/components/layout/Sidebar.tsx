import { FC, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Settings, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { FolderId } from '../../types';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { LogoMark } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UpdateButton } from '../ui/UpdateButton';
import { MailboxTypeLogo } from '../mailboxes/ProviderLogos';
import {
  IconInbox,
  IconStar,
  IconFlag,
  IconSend,
  IconDrafts,
  IconArchive,
  IconTrash,
  IconCompose,
} from '../ui/MailIcons';

export const FOLDERS: { id: FolderId; label: string; icon: FC<{ className?: string }> }[] = [
  { id: 'inbox', label: 'Inbox', icon: IconInbox },
  { id: 'starred', label: 'Starred', icon: IconStar },
  { id: 'important', label: 'Important', icon: IconFlag },
  { id: 'sent', label: 'Sent', icon: IconSend },
  { id: 'drafts', label: 'Drafts', icon: IconDrafts },
  { id: 'archive', label: 'Archive', icon: IconArchive },
  { id: 'trash', label: 'Trash', icon: IconTrash },
];

const SidebarContent: FC<{ onClose?: () => void }> = ({ onClose }) => {
  const emails = useAppStore((s) => s.emails);
  const user = useAppStore((s) => s.user);
  const mailboxes = useAppStore((s) => s.mailboxes);
  const selectedMailboxId = useAppStore((s) => s.selectedMailboxId);
  const selectMailbox = useAppStore((s) => s.selectMailbox);
  const openSettings = useAppStore((s) => s.openSettings);
  const isDemo = useAppStore((s) => s.isDemo);
  const selectedFolder = useAppStore((s) => s.selectedFolder);
  const selectFolder = useAppStore((s) => s.selectFolder);
  const openCompose = useAppStore((s) => s.openCompose);

  const unreadByMailbox = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of emails) if (!e.isRead && e.folder === 'inbox') map.set(e.accountId, (map.get(e.accountId) || 0) + 1);
    return map;
  }, [emails]);

  const counts = useMemo(() => {
    const unread = (f: (e: (typeof emails)[number]) => boolean) => emails.filter((e) => !e.isRead && f(e)).length;
    return {
      inbox: unread((e) => e.folder === 'inbox'),
      starred: emails.filter((e) => e.isStarred && e.folder !== 'trash').length,
      important: unread((e) => e.isImportant && e.folder !== 'trash'),
      drafts: emails.filter((e) => e.folder === 'drafts').length,
    } as Partial<Record<FolderId, number>>;
  }, [emails]);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6 flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-9 w-9 rounded-xl" />
          <span className="text-lg font-bold tracking-tight">Mailman</span>
          {isDemo && (
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              Demo
            </span>
          )}
        </div>
        {onClose && (
          <IconButton label="Close menu" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        )}
      </div>

      <Button
        size="lg"
        className="mb-6 w-full"
        onClick={() => {
          openCompose();
          onClose?.();
        }}
      >
        <IconCompose className="h-4 w-4" />
        Compose
      </Button>

      <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Folders">
        {FOLDERS.map(({ id, label, icon: Icon }) => {
          const active = selectedFolder === id;
          const count = counts[id];
          return (
            <button
              key={id}
              onClick={() => selectFolder(id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'text-primary-700 dark:text-white'
                  : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-white/5 dark:hover:text-white'
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-white shadow-card ring-1 ring-ink-200/70 dark:bg-white/10 dark:shadow-none dark:ring-white/10"
                />
              )}
              <Icon className={cn('relative h-[18px] w-[18px]', active && 'text-primary-600 dark:text-primary-300')} />
              <span className="relative flex-1 text-left">{label}</span>
              <AnimatePresence>
                {!!count && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className={cn(
                      'relative min-w-[1.5rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold',
                      active
                        ? 'bg-primary-600 text-white'
                        : 'bg-ink-200/70 text-ink-600 dark:bg-white/10 dark:text-ink-300'
                    )}
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}

        {mailboxes.length > 1 && (
          <div className="pt-5">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Mailboxes</p>
            {[{ id: null, label: 'All inboxes' }, ...mailboxes.map((m) => ({ id: m.id, label: m.email, mailbox: m }))].map((row) => {
              const active = selectedMailboxId === row.id;
              const unread = row.id ? unreadByMailbox.get(row.id) : undefined;
              return (
                <button
                  key={row.id || 'all'}
                  onClick={() => selectMailbox(row.id)}
                  className={cn(
                    'relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                    active ? 'font-semibold text-ink-900 dark:text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-white/5'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-mailbox"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-ink-200/60 dark:bg-white/10"
                    />
                  )}
                  <span className="relative flex h-[18px] w-[18px] items-center justify-center">
                    {'mailbox' in row && row.mailbox ? (
                      <MailboxTypeLogo type={row.mailbox.type} className="h-4 w-4" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-brand-gradient" />
                    )}
                  </span>
                  <span className="relative min-w-0 flex-1 truncate text-left">{row.label}</span>
                  {!!unread && <span className="relative text-[11px] font-bold text-ink-500">{unread}</span>}
                </button>
              );
            })}
          </div>
        )}
        {!isDemo && (
          <button
            onClick={() => openSettings('mailboxes')}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Plus className="h-[18px] w-[18px]" />
            Add mailbox
          </button>
        )}
      </nav>

      <div className="mt-4 space-y-1 border-t border-ink-200/70 pt-4 dark:border-white/10">
        <UpdateButton variant="row" autoCheck />
        <ThemeToggle showLabel className="w-full" />
        {user && (
          <button
            onClick={() => openSettings('account')}
            className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-ink-100 dark:hover:bg-white/5"
            aria-label="Open settings"
          >
            <Avatar name={user.displayName || user.email} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.displayName || user.email}</p>
              <p className="truncate text-xs text-ink-500 dark:text-ink-400">{user.email}</p>
            </div>
            <Settings className="h-4 w-4 text-ink-400 transition-transform duration-500 group-hover:rotate-90" />
          </button>
        )}
      </div>
    </div>
  );
};

export const Sidebar: FC = () => {
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-ink-200/70 bg-ink-50/80 dark:border-white/5 dark:bg-ink-950 lg:block">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-ink-50 shadow-float dark:bg-ink-900"
            >
              <SidebarContent onClose={() => setMobileNavOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
