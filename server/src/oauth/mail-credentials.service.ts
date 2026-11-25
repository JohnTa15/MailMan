import { Injectable } from '@nestjs/common';
import { Account } from '../database/entities/account.entity';
import { AccountService } from '../data/accounts/accounts.service';
import { decryptSecret, encryptSecret } from '../crypto/secret-box';
import { OAuthClientService } from './oauth-client.service';
import { MICROSOFT_CALENDAR_SCOPE, providerForMailbox } from './providers';

/** Thrown when only signing in again can fix access (expired or missing permission). */
export class ReconnectNeededError extends Error {}

/**
 * Login details for a mailbox's IMAP/SMTP servers and its calendar API,
 * refreshing OAuth tokens as needed. An Office 365 shared mailbox opens with
 * the sign-in of the mailbox it was added from.
 */
@Injectable()
export class MailCredentialsService {
  /** Microsoft Graph tokens (calendar), kept in memory only */
  private readonly graphTokens = new Map<string, { token: string; expiresAt: number }>();

  constructor(
    private readonly accountService: AccountService,
    private readonly oauthClient: OAuthClientService,
  ) {}

  async imapAuth(account: Account): Promise<{ user: string; pass?: string; accessToken?: string }> {
    if (account.authType === 'oauth2') {
      // Shared mailbox: log in AS the shared address with the owner's token
      return { user: account.email, accessToken: await this.accessToken(account) };
    }
    return { user: account.email, pass: decryptSecret(account.encryptedPassword) };
  }

  async smtpAuth(account: Account) {
    if (account.authType === 'oauth2') {
      const owner = await this.signInOwner(account);
      return { type: 'OAuth2' as const, user: owner.email, accessToken: await this.accessToken(account) };
    }
    return { user: account.email, pass: decryptSecret(account.encryptedPassword) };
  }

  /** The mailbox whose OAuth sign-in this one uses (itself, or a shared mailbox's owner). */
  async signInOwner(account: Account): Promise<Account> {
    if (!account.parentId) return account;
    const parent = await this.accountService.findOne(account.parentId);
    if (!parent) throw new ReconnectNeededError(`The mailbox that opened ${account.email} was removed`);
    return parent;
  }

  /** A valid access token for mail (and Google Calendar), refreshed when it expires within a minute. */
  async accessToken(account: Account): Promise<string> {
    const owner = await this.signInOwner(account);
    const expiresAt = owner.tokenExpiresAt ? new Date(owner.tokenExpiresAt).getTime() : 0;
    if (owner.accessToken && expiresAt > Date.now() + 60_000) {
      return decryptSecret(owner.accessToken);
    }

    const provider = providerForMailbox(owner.type);
    const refreshToken = decryptSecret(owner.refreshToken);
    if (!provider || !refreshToken) {
      throw new ReconnectNeededError(`Reconnect ${owner.email}: its sign-in has expired`);
    }
    const tokens = await this.oauthClient.refresh(provider, refreshToken);
    await this.accountService.update(owner.id, {
      accessToken: encryptSecret(tokens.accessToken),
      // Microsoft rotates refresh tokens; Google keeps the old one
      ...(tokens.refreshToken ? { refreshToken: encryptSecret(tokens.refreshToken) } : {}),
      tokenExpiresAt: tokens.expiresAt,
    });
    return tokens.accessToken;
  }

  /** A Microsoft Graph token for the calendar of this Outlook mailbox. */
  async graphToken(account: Account): Promise<string> {
    const owner = await this.signInOwner(account);
    const cached = this.graphTokens.get(owner.id);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

    const provider = providerForMailbox(owner.type);
    const refreshToken = decryptSecret(owner.refreshToken);
    if (!provider || !refreshToken) throw new ReconnectNeededError(`Reconnect ${owner.email}: its sign-in has expired`);
    let tokens;
    try {
      tokens = await this.oauthClient.refresh(provider, refreshToken, [MICROSOFT_CALENDAR_SCOPE, 'offline_access']);
    } catch (err) {
      // Mailboxes connected before calendars existed never allowed calendar access
      if (/consent|AADSTS65001|invalid_grant|scope/i.test(String(err))) {
        throw new ReconnectNeededError(`Reconnect ${owner.email} to allow calendar access`);
      }
      throw err;
    }
    if (tokens.refreshToken) await this.accountService.update(owner.id, { refreshToken: encryptSecret(tokens.refreshToken) });
    this.graphTokens.set(owner.id, { token: tokens.accessToken, expiresAt: tokens.expiresAt.getTime() });
    return tokens.accessToken;
  }
}
