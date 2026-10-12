import { ReactNode } from 'react';

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

export interface Folder {
  id: string;
  name: string;
  count: number;
  type: 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'draft' | 'spam' | 'custom';
  color?: string;
}

export interface Account {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  type: 'imap' | 'ews' | 'gmail' | 'outlook';
  connected: boolean;
}
