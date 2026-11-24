import api from '../lib/api';
import { Email } from '../types';

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

  /** Fetches new mail on the server; reports mailboxes that failed. */
  async sync() {
    const response = await api.post<{ added: number; errors: { mailbox: string; message: string }[] }>(
      '/mail/sync',
      {},
      { timeout: 120000 }
    );
    return response.data;
  },

  async sendEmail(data: { accountId?: string; to: string; subject: string; body: string; attachments: File[] }) {
    const form = new FormData();
    if (data.accountId) form.append('accountId', data.accountId);
    form.append('to', data.to);
    form.append('subject', data.subject);
    form.append('body', data.body);
    data.attachments.forEach((file) => form.append('attachments', file));
    await api.post('/mail/send', form);
  },
};
