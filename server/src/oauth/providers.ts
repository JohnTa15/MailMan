import { MailboxType } from '../database/entities/account.entity';

export type OAuthProviderId = 'google' | 'microsoft';

interface ServerSettings {
  host: string;
  port: number;
  secure: boolean;
}

export interface OAuthProvider {
  id: OAuthProviderId;
  label: string;
  mailboxType: MailboxType;
  authorizeUrl: () => string;
  tokenUrl: () => string;
  /** Everything the person is asked to allow */
  scopes: string[];
  /**
   * Scopes for the mail token. Microsoft issues one token per API, so its
   * calendar scope is consented up front and fetched with a separate token.
   */
  tokenScopes?: string[];
  /** Extra query parameters for the consent screen */
  authorizeParams: Record<string, string>;
  /** Microsoft wants the scopes repeated on token requests */
  scopeOnTokenRequest: boolean;
  imap: ServerSettings;
  smtp: ServerSettings;
  clientId: () => string | undefined;
  clientSecret: () => string | undefined;
}

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
export const MICROSOFT_CALENDAR_SCOPE = 'https://graph.microsoft.com/Calendars.Read';
const MICROSOFT_MAIL_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'https://outlook.office.com/IMAP.AccessAsUser.All',
  'https://outlook.office.com/SMTP.Send',
];

/** API bases, overridable for tests */
export const googleCalendarApi = () => process.env.GOOGLE_CALENDAR_API || 'https://www.googleapis.com/calendar/v3';
export const microsoftGraphApi = () => process.env.MICROSOFT_GRAPH_API || 'https://graph.microsoft.com/v1.0';

const microsoftAuthority = () =>
  process.env.MICROSOFT_AUTHORITY ||
  `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT || 'common'}`;

export const OAUTH_PROVIDERS: Record<OAuthProviderId, OAuthProvider> = {
  google: {
    id: 'google',
    label: 'Google',
    mailboxType: 'gmail',
    authorizeUrl: () => process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: () => process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
    // mail.google.com is the scope Gmail's IMAP/SMTP accept for XOAUTH2
    scopes: ['openid', 'email', 'profile', 'https://mail.google.com/', GOOGLE_CALENDAR_SCOPE],
    // offline + consent: always get a refresh token
    authorizeParams: { access_type: 'offline', prompt: 'consent' },
    scopeOnTokenRequest: false,
    imap: { host: 'imap.gmail.com', port: 993, secure: true },
    smtp: { host: 'smtp.gmail.com', port: 465, secure: true },
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
  },
  microsoft: {
    id: 'microsoft',
    label: 'Microsoft',
    mailboxType: 'outlook',
    authorizeUrl: () => `${microsoftAuthority()}/oauth2/v2.0/authorize`,
    tokenUrl: () => `${microsoftAuthority()}/oauth2/v2.0/token`,
    scopes: [...MICROSOFT_MAIL_SCOPES, MICROSOFT_CALENDAR_SCOPE],
    tokenScopes: MICROSOFT_MAIL_SCOPES,
    authorizeParams: { prompt: 'select_account' },
    scopeOnTokenRequest: true,
    imap: { host: 'outlook.office365.com', port: 993, secure: true },
    smtp: { host: 'smtp.office365.com', port: 587, secure: false },
    clientId: () => process.env.MICROSOFT_CLIENT_ID,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET,
  },
};

export function getOAuthProvider(id: string): OAuthProvider | null {
  return (OAUTH_PROVIDERS as Record<string, OAuthProvider>)[id] || null;
}

/** A provider is offered only when both its client ID and secret are set. */
export function isOAuthConfigured(id: OAuthProviderId): boolean {
  const provider = OAUTH_PROVIDERS[id];
  return !!(provider.clientId() && provider.clientSecret());
}

export function providerForMailbox(type: MailboxType): OAuthProvider | null {
  return Object.values(OAUTH_PROVIDERS).find((p) => p.mailboxType === type) || null;
}
