import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ComposeDraft, Email, FolderId, Mailbox, User } from '../types';

export type SettingsTab = 'account' | 'mailboxes' | 'invites';

interface AppState {
  // Session
  token: string | null;
  user: User | null;
  mailboxes: Mailbox[];
  isDemo: boolean;
  /** The Mailman server the desktop/Android app talks to; empty = build default */
  serverUrl: string;
  /** Invite code from an invite link, waiting for the sign-up form */
  pendingInvite: string | null;

  // Mail
  emails: Email[];
  isLoading: boolean;
  selectedFolder: FolderId;
  /** Show one mailbox only; null = all inboxes */
  selectedMailboxId: string | null;
  selectedEmailId: string | null;
  searchQuery: string;

  // UI
  darkMode: boolean;
  mobileNavOpen: boolean;
  compose: ComposeDraft | null;
  settings: SettingsTab | null;

  signIn: (token: string, user: User) => void;
  setUser: (user: User) => void;
  setMailboxes: (mailboxes: Mailbox[]) => void;
  startDemo: (user: User, mailboxes: Mailbox[], emails: Email[]) => void;
  signOut: () => void;
  setServerUrl: (url: string) => void;
  setPendingInvite: (code: string | null) => void;
  setEmails: (emails: Email[]) => void;
  setLoading: (loading: boolean) => void;
  patchEmail: (id: string, changes: Partial<Email>) => void;
  removeEmail: (id: string) => void;
  addEmail: (email: Email) => void;
  selectFolder: (folder: FolderId) => void;
  selectMailbox: (id: string | null) => void;
  selectEmail: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setDarkMode: (dark: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  openCompose: (draft?: ComposeDraft) => void;
  closeCompose: () => void;
  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
}

const prefersDark =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const signedOut = {
  token: null,
  user: null,
  mailboxes: [],
  isDemo: false,
  emails: [],
  selectedEmailId: null,
  selectedFolder: 'inbox' as FolderId,
  selectedMailboxId: null,
  searchQuery: '',
  compose: null,
  settings: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...signedOut,
      serverUrl: '',
      pendingInvite: null,

      isLoading: false,
      darkMode: !!prefersDark,
      mobileNavOpen: false,

      signIn: (token, user) => set({ ...signedOut, token, user }),
      setUser: (user) => set({ user }),
      setMailboxes: (mailboxes) =>
        set((state) => ({
          mailboxes,
          // Drop a filter for a mailbox that is gone
          selectedMailboxId: mailboxes.some((m) => m.id === state.selectedMailboxId) ? state.selectedMailboxId : null,
        })),
      startDemo: (user, mailboxes, emails) => set({ ...signedOut, user, mailboxes, emails, isDemo: true }),
      signOut: () => set(signedOut),
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setPendingInvite: (pendingInvite) => set({ pendingInvite }),

      setEmails: (emails) => set({ emails }),
      setLoading: (isLoading) => set({ isLoading }),
      patchEmail: (id, changes) =>
        set((state) => ({
          emails: state.emails.map((e) => (e.id === id ? { ...e, ...changes } : e)),
        })),
      removeEmail: (id) =>
        set((state) => ({
          emails: state.emails.filter((e) => e.id !== id),
          selectedEmailId: state.selectedEmailId === id ? null : state.selectedEmailId,
        })),
      addEmail: (email) => set((state) => ({ emails: [email, ...state.emails] })),

      selectFolder: (selectedFolder) =>
        set({ selectedFolder, selectedEmailId: null, searchQuery: '', mobileNavOpen: false }),
      selectMailbox: (selectedMailboxId) => set({ selectedMailboxId, selectedEmailId: null, mobileNavOpen: false }),
      selectEmail: (selectedEmailId) => set({ selectedEmailId }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      openCompose: (draft = {}) => set({ compose: draft }),
      closeCompose: () => set({ compose: null }),
      openSettings: (tab = 'account') => set({ settings: tab, mobileNavOpen: false }),
      closeSettings: () => set({ settings: null }),
    }),
    {
      name: 'webmail-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        mailboxes: state.mailboxes,
        isDemo: state.isDemo,
        serverUrl: state.serverUrl,
        darkMode: state.darkMode,
      }),
    }
  )
);

/** Emails visible in the current folder and mailbox, newest first. */
export function selectVisibleEmails(
  state: Pick<AppState, 'emails' | 'selectedFolder' | 'searchQuery' | 'selectedMailboxId'>
) {
  const { emails, selectedFolder, searchQuery, selectedMailboxId } = state;
  const q = searchQuery.trim().toLowerCase();
  return emails
    .filter((e) => !selectedMailboxId || e.accountId === selectedMailboxId)
    .filter((e) => {
      if (selectedFolder === 'starred') return e.isStarred && e.folder !== 'trash';
      if (selectedFolder === 'important') return e.isImportant && e.folder !== 'trash';
      return e.folder === selectedFolder;
    })
    .filter(
      (e) =>
        !q ||
        e.subject.toLowerCase().includes(q) ||
        e.from.toLowerCase().includes(q) ||
        (e.fromName || '').toLowerCase().includes(q) ||
        e.preview.toLowerCase().includes(q)
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
