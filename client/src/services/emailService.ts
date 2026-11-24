import api from '../lib/api';
import { Email, MailCounts } from '../types';

/** Messages per page of the list */
export const PAGE_SIZE = 100;

export interface EmailQuery {
  folder: string;
  accountId?: string | null;
  search?: string;
  page?: number;
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
  /** One page of a folder (newest first); `hasMore` when a full page came back. */
  async getEmails({ folder, accountId, search, page = 1 }: EmailQuery) {
    const response = await api.get<ServerEmail[]>('/emails', {
      params: { folder, accountId: accountId || undefined, search: search?.trim() || undefined, page, limit: PAGE_SIZE },
    });
    return { emails: response.data.map(normalize), hasMore: response.data.length === PAGE_SIZE };
  },

  async counts() {
    const response = await api.get<MailCounts>('/emails/counts');
    return response.data;
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
