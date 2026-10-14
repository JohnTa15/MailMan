import { FC, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Archive, FileText, Inbox, LogOut, PenSquare, Send, Star, Trash2, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { FolderId } from '../../types';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { LogoMark } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { UpdateButton } from '../ui/UpdateButton';

export const FOLDERS: { id: FolderId; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'important', label: 'Important', icon: AlertCircle },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

const SidebarContent: FC<{ onClose?: () => void }> = ({ onClose }) => {
  const emails = useAppStore((s) => s.emails);
  const account = useAppStore((s) => s.account);
  const isDemo = useAppStore((s) => s.isDemo);
  const selectedFolder = useAppStore((s) => s.selectedFolder);
  const selectFolder = useAppStore((s) => s.selectFolder);
  const openCompose = useAppStore((s) => s.openCompose);
  const signOut = useAppStore((s) => s.signOut);

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
        <PenSquare className="h-4 w-4" />
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
      </nav>

      <div className="mt-4 space-y-1 border-t border-ink-200/70 pt-4 dark:border-white/10">
        <UpdateButton variant="row" autoCheck />
        <ThemeToggle showLabel className="w-full" />
        {account && (
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={account.displayName || account.email} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{account.displayName || account.email}</p>
              <p className="truncate text-xs text-ink-500 dark:text-ink-400">{account.email}</p>
            </div>
            <IconButton label="Sign out" tone="danger" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </IconButton>
          </div>
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
