import { FC, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, MailOpen, PenSquare } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useMail } from '../../hooks/useMail';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Email } from '../../types';
import { EmailList } from '../email/EmailList';
import { EmailView } from '../email/EmailView';
import { ComposeModal } from '../compose/ComposeModal';
import { Sidebar } from './Sidebar';
import { CalendarView } from '../calendar/CalendarView';
import { SettingsModal } from '../settings/SettingsModal';
import { AddMailbox } from '../mailboxes/AddMailbox';
import { IconButton } from '../ui/Button';

/** First run: no mailbox yet, so there is nothing to list. */
const Welcome: FC = () => {
  const user = useAppStore((s) => s.user);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  return (
    <div className="relative flex min-w-0 flex-1 justify-center overflow-y-auto px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <IconButton label="Open menu" className="absolute left-3 top-3 lg:hidden" onClick={() => setMobileNavOpen(true)}>
        <Menu className="h-5 w-5" />
      </IconButton>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="w-full max-w-lg pt-6 sm:pt-12"
      >
        <div className="relative mx-auto mb-6 w-fit">
          <div className="absolute -inset-6 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
          <div className="glass relative flex h-20 w-20 animate-float items-center justify-center rounded-3xl text-primary-500 shadow-card">
            <MailOpen className="h-9 w-9" />
          </div>
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight">
          Welcome{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!
        </h1>
        <p className="mb-8 mt-2 text-center text-ink-500 dark:text-ink-400">Connect your first mailbox to fill your inbox.</p>
        <AddMailbox />
      </motion.div>
    </div>
  );
};

const ReaderEmpty: FC = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex h-full flex-col items-center justify-center p-8 text-center"
  >
    <div className="relative mb-6">
      <div className="absolute -inset-6 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
      <div className="glass relative flex h-24 w-24 animate-float items-center justify-center rounded-[2rem] text-primary-500 shadow-card">
        <MailOpen className="h-10 w-10" />
      </div>
    </div>
    <p className="text-lg font-semibold">Select a message</p>
    <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
      Pick something from the list, or press <kbd className="rounded-md border border-ink-200 px-1.5 py-0.5 font-mono text-xs dark:border-white/10">C</kbd> to compose.
    </p>
  </motion.div>
);

export const MainLayout: FC = () => {
  const emails = useAppStore((s) => s.emails);
  const selectedEmailId = useAppStore((s) => s.selectedEmailId);
  const selectEmail = useAppStore((s) => s.selectEmail);
  const compose = useAppStore((s) => s.compose);
  const openCompose = useAppStore((s) => s.openCompose);
  const settings = useAppStore((s) => s.settings);
  const isDemo = useAppStore((s) => s.isDemo);
  const hasMailboxes = useAppStore((s) => s.mailboxes.length > 0);
  const view = useAppStore((s) => s.view);
  const { refresh, poll, loadSession, markRead } = useMail();
  const selectedFolder = useAppStore((s) => s.selectedFolder);
  const selectedMailboxId = useAppStore((s) => s.selectedMailboxId);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const [search, setSearch] = useState(searchQuery.trim());

  const selected = useMemo(() => emails.find((e) => e.id === selectedEmailId) || null, [emails, selectedEmailId]);
  // Tailwind's lg breakpoint: one reader per layout, so each message renders once
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  // Search on the server once typing pauses
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Each folder, mailbox and search loads its own newest page
  useEffect(() => {
    void refresh();
  }, [refresh, selectedFolder, selectedMailboxId, search]);

  // The server syncs in the background; pick up what it finds
  useEffect(() => {
    if (isDemo) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void poll();
    }, 30000);
    return () => clearInterval(timer);
  }, [isDemo, poll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const { compose: open } = useAppStore.getState();
      if (open) return;
      if (e.key === 'c') {
        e.preventDefault();
        openCompose();
      } else if (e.key === 'Escape') {
        selectEmail(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCompose, selectEmail]);

  const handleSelect = (email: Email) => {
    selectEmail(email.id);
    markRead(email);
  };

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar />

      {!isDemo && !hasMailboxes ? (
        <Welcome />
      ) : view === 'calendar' ? (
        <main className="relative flex min-w-0 flex-1 bg-white/40 dark:bg-ink-900/30">
          <CalendarView />
        </main>
      ) : (
      <main className="relative flex min-w-0 flex-1">
          <EmailList
            onSelect={handleSelect}
            className="w-full border-ink-200/70 dark:border-white/5 lg:w-[380px] lg:shrink-0 lg:border-r xl:w-[420px]"
          />
  
          {/* Desktop reader */}
          {isDesktop && (
            <div className="min-w-0 flex-1 bg-white/60 dark:bg-ink-900/40">
              <AnimatePresence mode="wait">
                {selected ? <EmailView key={selected.id} email={selected} onBack={() => selectEmail(null)} /> : <ReaderEmpty key="empty" />}
              </AnimatePresence>
            </div>
          )}
  
          {/* Mobile reader slides over the list */}
          <AnimatePresence>
            {selected && !isDesktop && (
              <motion.div
                key="mobile-reader"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 40 }}
                className="absolute inset-0 z-20 bg-ink-50 dark:bg-ink-950 lg:hidden"
              >
                <EmailView email={selected} onBack={() => selectEmail(null)} />
              </motion.div>
            )}
          </AnimatePresence>
  
          {/* Mobile compose button */}
          <AnimatePresence>
            {!selected && (
              <motion.button
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 45 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => openCompose()}
                aria-label="Compose"
                className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow lg:hidden"
              >
                <PenSquare className="h-6 w-6" />
              </motion.button>
            )}
          </AnimatePresence>
        </main>
      )}

      <AnimatePresence>{compose && <ComposeModal key="compose" draft={compose} />}</AnimatePresence>
      <AnimatePresence>{settings && <SettingsModal key="settings" tab={settings} />}</AnimatePresence>
    </div>
  );
};
