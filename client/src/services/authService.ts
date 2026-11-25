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
  /** Adds an Office 365 shared mailbox opened with this mailbox's Microsoft sign-in */
  async addShared(parentId: string, email: string) {
    return (await api.post<Mailbox>(`/mailboxes/${parentId}/shared`, { email })).data;
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

export interface ProviderIntegration {
  id: OAuthProviderId;
  label: string;
  configured: boolean;
  clientIdVar: string;
  clientSecretVar: string;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  redirectUri: string;
  tenant?: string;
}

export interface Integrations {
  publicUrl: string;
  publicUrlSet: boolean;
  publicUrlSecure: boolean;
  providers: ProviderIntegration[];
}

export const adminService = {
  async integrations() {
    return (await api.get<Integrations>('/admin/integrations')).data;
  },
};

export type AiScope = 'read' | 'organize' | 'drafts';

export interface AiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: AiScope[];
  lastUsedAt: string | null;
  createdAt: string;
}

export interface AiActivity {
  id: string;
  keyName: string;
  tool: string;
  summary: string;
  ok: boolean;
  createdAt: string;
}

export const aiService = {
  async keys() {
    return (await api.get<AiKey[]>('/ai/keys')).data;
  },
  /** The returned `key` is shown once; the server keeps only a hash. */
  async createKey(name: string, scopes: AiScope[]) {
    return (await api.post<AiKey & { key: string }>('/ai/keys', { name, scopes })).data;
  },
  async revokeKey(id: string) {
    await api.delete(`/ai/keys/${id}`);
  },
  async activity() {
    return (await api.get<AiActivity[]>('/ai/activity', { params: { limit: 30 } })).data;
  },
};
