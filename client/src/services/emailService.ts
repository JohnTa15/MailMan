import api from '../lib/api';
import { Account, Email } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
}

export interface LoginResponse {
  access_token: string;
  account: Account;
}

type ServerEmail = Omit<Email, 'labels' | 'attachments' | 'preview'> & {
  labels: string[] | null;
  preview: string | null;
};

function normalize(email: ServerEmail): Email {
  return {
    ...email,
    fromName: email.fromName || undefined,
    preview: email.preview || '',
    labels: email.labels || [],
    attachments: [],
  };
}

export const emailService = {
  async login(request: LoginRequest) {
    const response = await api.post<LoginResponse>('/auth/login', request);
    return response.data;
  },

  async getEmails() {
    const response = await api.get<ServerEmail[]>('/emails', { params: { limit: 500 } });
    return response.data.map(normalize);
  },

  async updateEmail(id: string, changes: Partial<Pick<Email, 'isRead' | 'isStarred' | 'isImportant' | 'folder'>>) {
    await api.patch(`/emails/${id}`, changes);
  },

  async deleteEmail(id: string) {
    await api.delete(`/emails/${id}`);
  },

  async sync() {
    const response = await api.post<{ added: number }>('/mail/sync');
    return response.data.added;
  },

  async sendEmail(data: { to: string; subject: string; body: string; attachments: File[] }) {
    const form = new FormData();
    form.append('to', data.to);
    form.append('subject', data.subject);
    form.append('body', data.body);
    data.attachments.forEach((file) => form.append('attachments', file));
    await api.post('/mail/send', form);
  },
};
