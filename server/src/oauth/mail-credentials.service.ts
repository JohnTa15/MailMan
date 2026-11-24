import { Injectable } from '@nestjs/common';
import { Account } from '../database/entities/account.entity';
import { AccountService } from '../data/accounts/accounts.service';
import { decryptSecret, encryptSecret } from '../crypto/secret-box';
import { OAuthClientService } from './oauth-client.service';
import { providerForMailbox } from './providers';

/** Login details for a mailbox's IMAP/SMTP servers, refreshing OAuth tokens as needed. */
@Injectable()
export class MailCredentialsService {
  constructor(
    private readonly accountService: AccountService,
    private readonly oauthClient: OAuthClientService,
  ) {}

  async imapAuth(account: Account): Promise<{ user: string; pass?: string; accessToken?: string }> {
    if (account.authType === 'oauth2') {
      return { user: account.email, accessToken: await this.accessToken(account) };
    }
    return { user: account.email, pass: decryptSecret(account.encryptedPassword) };
  }

  async smtpAuth(account: Account) {
    if (account.authType === 'oauth2') {
      return { type: 'OAuth2' as const, user: account.email, accessToken: await this.accessToken(account) };
    }
    return { user: account.email, pass: decryptSecret(account.encryptedPassword) };
  }

  /** A valid access token, refreshed when it expires within a minute. */
  private async accessToken(account: Account): Promise<string> {
    const expiresAt = account.tokenExpiresAt ? new Date(account.tokenExpiresAt).getTime() : 0;
    if (account.accessToken && expiresAt > Date.now() + 60_000) {
      return decryptSecret(account.accessToken);
    }

    const provider = providerForMailbox(account.type);
    const refreshToken = decryptSecret(account.refreshToken);
    if (!provider || !refreshToken) {
      throw new Error(`Reconnect ${account.email}: its sign-in has expired`);
    }
    const tokens = await this.oauthClient.refresh(provider, refreshToken);
    await this.accountService.update(account.id, {
      accessToken: encryptSecret(tokens.accessToken),
      // Microsoft rotates refresh tokens; Google keeps the old one
      ...(tokens.refreshToken ? { refreshToken: encryptSecret(tokens.refreshToken) } : {}),
      tokenExpiresAt: tokens.expiresAt,
    });
    return tokens.accessToken;
  }
}
