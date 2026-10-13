import { FC, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MailOpen, PenSquare } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useMail } from '../../hooks/useMail';
import { Email } from '../../types';
import { EmailList } from '../email/EmailList';
import { EmailView } from '../email/EmailView';
import { ComposeModal } from '../compose/ComposeModal';
import { Sidebar } from './Sidebar';

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
  const { refresh, markRead } = useMail();

  const selected = useMemo(() => emails.find((e) => e.id === selectedEmailId) || null, [emails, selectedEmailId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

      <main className="relative flex min-w-0 flex-1">
        <EmailList
          onSelect={handleSelect}
          className="w-full border-ink-200/70 dark:border-white/5 lg:w-[380px] lg:shrink-0 lg:border-r xl:w-[420px]"
        />

        {/* Desktop reader */}
        <div className="hidden min-w-0 flex-1 bg-white/60 dark:bg-ink-900/40 lg:block">
          <AnimatePresence mode="wait">
            {selected ? <EmailView key={selected.id} email={selected} onBack={() => selectEmail(null)} /> : <ReaderEmpty key="empty" />}
          </AnimatePresence>
        </div>

        {/* Mobile reader slides over the list */}
        <AnimatePresence>
          {selected && (
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

      <AnimatePresence>{compose && <ComposeModal key="compose" draft={compose} />}</AnimatePresence>
    </div>
  );
};
