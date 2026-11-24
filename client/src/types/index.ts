export interface Email {
  id: string;
  accountId: string;
  subject: string;
  from: string;
  fromName?: string;
  to: string;
  toName?: string;
  date: string;
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

/** The person signed in to Mailman. */
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'admin' | 'user';
  hasPassword: boolean;
  google: boolean;
  microsoft: boolean;
}

export type MailboxType = 'imap' | 'ews' | 'gmail' | 'outlook' | 'yahoo' | 'icloud';

/** A connected email account; a user can have several. */
export interface Mailbox {
  id: string;
  email: string;
  displayName: string | null;
  type: MailboxType;
  authType: 'password' | 'oauth2';
  connected: boolean;
  lastSyncAt?: string | null;
  syncError?: string | null;
  /** Every older message has been downloaded */
  syncComplete?: boolean;
}

export type OAuthProviderId = 'google' | 'microsoft';

export interface ServerStatus {
  hasUsers: boolean;
  providers: Record<OAuthProviderId, boolean>;
}

export interface Invite {
  id: string;
  code: string;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  status: 'active' | 'used' | 'expired';
}

/** Sidebar views; `starred` and `important` are filters across all folders. */
export type FolderId = 'inbox' | 'starred' | 'important' | 'sent' | 'drafts' | 'archive' | 'spam' | 'trash';

/** Sidebar numbers from the server: unread inbox (also per mailbox), starred, important, drafts, spam */
export interface MailCounts {
  inbox: number;
  starred: number;
  important: number;
  drafts: number;
  spam: number;
  byMailbox: Record<string, number>;
}

export interface ComposeDraft {
  /** Editing a saved draft: it is removed once sent */
  draftId?: string;
  accountId?: string;
  to?: string;
  subject?: string;
  body?: string;
}
