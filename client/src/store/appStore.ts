import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Account, ComposeDraft, Email, FolderId } from '../types';

interface AppState {
  // Session
  token: string | null;
  account: Account | null;
  isDemo: boolean;

  // Mail
  emails: Email[];
  isLoading: boolean;
  selectedFolder: FolderId;
  selectedEmailId: string | null;
  searchQuery: string;

  // UI
  darkMode: boolean;
  mobileNavOpen: boolean;
  compose: ComposeDraft | null;

  signIn: (token: string, account: Account) => void;
  startDemo: (account: Account, emails: Email[]) => void;
  signOut: () => void;
  setEmails: (emails: Email[]) => void;
  setLoading: (loading: boolean) => void;
  patchEmail: (id: string, changes: Partial<Email>) => void;
  removeEmail: (id: string) => void;
  addEmail: (email: Email) => void;
  selectFolder: (folder: FolderId) => void;
  selectEmail: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setDarkMode: (dark: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  openCompose: (draft?: ComposeDraft) => void;
  closeCompose: () => void;
}

const prefersDark =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      account: null,
      isDemo: false,

      emails: [],
      isLoading: false,
      selectedFolder: 'inbox',
      selectedEmailId: null,
      searchQuery: '',

      darkMode: !!prefersDark,
      mobileNavOpen: false,
      compose: null,

      signIn: (token, account) => set({ token, account, isDemo: false, emails: [] }),
      startDemo: (account, emails) => set({ token: null, account, isDemo: true, emails }),
      signOut: () =>
        set({
          token: null,
          account: null,
          isDemo: false,
          emails: [],
          selectedEmailId: null,
          selectedFolder: 'inbox',
          searchQuery: '',
          compose: null,
        }),

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
      selectEmail: (selectedEmailId) => set({ selectedEmailId }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setDarkMode: (darkMode) => set({ darkMode }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      openCompose: (draft = {}) => set({ compose: draft }),
      closeCompose: () => set({ compose: null }),
    }),
    {
      name: 'webmail-storage',
      partialize: (state) => ({
        token: state.token,
        account: state.account,
        isDemo: state.isDemo,
        darkMode: state.darkMode,
      }),
    }
  )
);

/** Emails visible in the current folder, newest first. */
export function selectVisibleEmails(state: Pick<AppState, 'emails' | 'selectedFolder' | 'searchQuery'>) {
  const { emails, selectedFolder, searchQuery } = state;
  const q = searchQuery.trim().toLowerCase();
  return emails
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
