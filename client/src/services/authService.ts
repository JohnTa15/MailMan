import api from '../lib/api';
import { Invite, Mailbox, OAuthProviderId, ServerStatus, User } from '../types';

export interface Session {
  access_token: string;
  user: User;
}

export type OAuthPoll =
  | { status: 'pending' }
  | { status: 'error'; message: string }
  | ({ status: 'done'; mailboxError?: string; mailbox?: Mailbox } & Partial<Session>);

export const authService = {
  async status() {
    return (await api.get<ServerStatus>('/auth/status', { timeout: 10000 })).data;
  },
  async login(email: string, password: string) {
    return (await api.post<Session>('/auth/login', { email, password })).data;
  },
  async signup(data: { email: string; password: string; displayName?: string; invite?: string }) {
    return (await api.post<Session>('/auth/signup', data)).data;
  },
  async me() {
    return (await api.get<{ user: User; mailboxes: Mailbox[] }>('/auth/me')).data;
  },
  async updateMe(data: { displayName?: string; currentPassword?: string; newPassword?: string }) {
    return (await api.patch<User>('/auth/me', data)).data;
  },
  async oauthStart(provider: OAuthProviderId, mode: 'signin' | 'connect', invite?: string) {
    return (await api.post<{ url: string; pollId: string }>(`/auth/oauth/${provider}/start`, { mode, invite })).data;
  },
  async oauthPoll(pollId: string) {
    return (await api.get<OAuthPoll>(`/auth/oauth/poll/${pollId}`)).data;
  },
};

export interface PasswordMailbox {
  email: string;
  password: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
}

export const mailboxService = {
  async list() {
    return (await api.get<Mailbox[]>('/mailboxes')).data;
  },
  async connect(data: PasswordMailbox) {
    // Logging in to a mail server can take a while
    return (await api.post<Mailbox>('/mailboxes', data, { timeout: 60000 })).data;
  },
  async remove(id: string) {
    await api.delete(`/mailboxes/${id}`);
  },
};

export const inviteService = {
  async list() {
    return (await api.get<Invite[]>('/invites')).data;
  },
  async create(note: string, days: number) {
    return (await api.post<Invite>('/invites', { note, days })).data;
  },
  async remove(id: string) {
    await api.delete(`/invites/${id}`);
  },
};
