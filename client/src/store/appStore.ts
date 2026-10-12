import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Account {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  type: 'imap' | 'ews' | 'gmail' | 'outlook';
  connected: boolean;
  lastSync?: Date;
}

export interface Email {
  id: string;
  accountId: string;
  subject: string;
  from: string;
  fromName?: string;
  to: string;
  toName?: string;
  date: Date;
  preview: string;
  body: string;
  html?: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  labels: string[];
  attachments: Attachment[];
  folder: string;
  threadId?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
}

export interface Folder {
  id: string;
  name: string;
  count: number;
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'draft' | 'spam' | 'custom';
  color?: string;
}

type View = 'list' | 'thread' | 'compose' | 'settings';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  accounts: Account[];
  currentAccountId: string | null;
  
  // Email
  emails: Email[];
  selectedEmail: Email | null;
  selectedFolder: string;
  searchQuery: string;
  filters: {
    read: boolean | null;
    starred: boolean | null;
    important: boolean | null;
  };
  
  // UI
  view: View;
  sidebarOpen: boolean;
  darkMode: boolean;
  compactMode: boolean;
  
  // Actions
  setAuthenticated: (auth: boolean) => void;
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
  setCurrentAccount: (id: string) => void;
  setEmails: (emails: Email[]) => void;
  setSelectedEmail: (email: Email | null) => void;
  setSelectedFolder: (folder: string) => void;
  setSearchQuery: (query: string) => void;
  setView: (view: View) => void;
  setSidebarOpen: (open: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  toggleRead: (emailId: string) => void;
  toggleStarred: (emailId: string) => void;
  deleteEmail: (emailId: string) => void;
  markAsImportant: (emailId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      isAuthenticated: false,
      accounts: [],
      currentAccountId: null,
      
      // Email
      emails: [],
      selectedEmail: null,
      selectedFolder: 'inbox',
      searchQuery: '',
      filters: {
        read: null,
        starred: null,
        important: null,
      },
      
      // UI
      view: 'list',
      sidebarOpen: true,
      darkMode: false,
      compactMode: false,
      
      // Actions
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      addAccount: (account) =>
        set((state) => ({
          accounts: [...state.accounts, account],
        })),
      
      removeAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
          currentAccountId:
            state.currentAccountId === id ? null : state.currentAccountId,
        })),
      
      setCurrentAccount: (id) => set({ currentAccountId: id }),
      
      setEmails: (emails) => set({ emails }),
      
      setSelectedEmail: (email) => set({ selectedEmail: email }),
      
      setSelectedFolder: (folder) => set({ selectedFolder: folder }),
      
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      
      setView: (view) => set({ view }),
      
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      
      setDarkMode: (darkMode) => set({ darkMode }),
      
      setCompactMode: (compactMode) => set({ compactMode }),
      
      toggleRead: (emailId) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === emailId ? { ...e, isRead: !e.isRead } : e
          ),
        })),
      
      toggleStarred: (emailId) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === emailId ? { ...e, isStarred: !e.isStarred } : e
          ),
        })),
      
      deleteEmail: (emailId) =>
        set((state) => ({
          emails: state.emails.filter((e) => e.id !== emailId),
          selectedEmail:
            state.selectedEmail?.id === emailId ? null : state.selectedEmail,
        })),
      
      markAsImportant: (emailId) =>
        set((state) => ({
          emails: state.emails.map((e) =>
            e.id === emailId ? { ...e, isImportant: !e.isImportant } : e
          ),
        })),
    }),
    {
      name: 'webmail-storage',
      partialize: (state) => ({
        darkMode: state.darkMode,
        compactMode: state.compactMode,
        sidebarOpen: state.sidebarOpen,
        accounts: state.accounts,
        currentAccountId: state.currentAccountId,
      }),
    }
  )
);
