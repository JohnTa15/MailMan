import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'crypto';
import { AccountService } from '../data/accounts/accounts.service';
import { Account } from '../database/entities/account.entity';
import { encryptSecret, decryptSecret } from '../crypto/secret-box';
import { discoverProvider } from '../protocols/providers';
import { ImapSyncService } from '../protocols/imap/imap.sync.service';

export interface LoginDto {
  email: string;
  password: string;
  displayName?: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly accountService: AccountService,
    private readonly imapSyncService: ImapSyncService,
  ) {}

  async validateUser(email: string, password: string): Promise<Account | null> {
    const account = await this.accountService.findByEmail(email);
    if (!account || !account.encryptedPassword || !password) {
      return null;
    }

    let stored: Buffer;
    try {
      stored = Buffer.from(decryptSecret(account.encryptedPassword), 'utf8');
    } catch {
      return null;
    }
    const given = Buffer.from(password, 'utf8');
    if (stored.length !== given.length || !timingSafeEqual(stored, given)) {
      return null;
    }

    return account;
  }

  /**
   * Signs in to an existing account, or connects a new one: the mail
   * server settings come from the request or from provider discovery, and
   * the account is only created once the IMAP server accepts the login.
   */
  async connect(dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const existing = await this.accountService.findByEmail(email);
    if (existing) {
      const account = await this.validateUser(email, dto.password);
      if (!account) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return this.login(account);
    }

    const preset = discoverProvider(email);
    const imapHost = dto.imapHost || preset?.imapHost;
    const smtpHost = dto.smtpHost || preset?.smtpHost;
    if (!imapHost || !smtpHost) {
      throw new BadRequestException(
        'Could not detect your mail server. Enter the IMAP and SMTP settings.',
      );
    }

    const settings = {
      imapHost,
      imapPort: Number(dto.imapPort) || preset?.imapPort || 993,
      imapSecure: dto.imapSecure ?? preset?.imapSecure ?? true,
      smtpHost,
      smtpPort: Number(dto.smtpPort) || preset?.smtpPort || 587,
      smtpSecure: dto.smtpSecure ?? preset?.smtpSecure ?? false,
    };

    const ok = await this.imapSyncService.verifyCredentials({
      host: settings.imapHost,
      port: settings.imapPort,
      secure: settings.imapSecure,
      user: email,
      pass: dto.password,
    });
    if (!ok) {
      throw new UnauthorizedException('Could not sign in to your mail server. Check your password and server settings.');
    }

    const account = await this.accountService.create({
      email,
      displayName: dto.displayName || email.split('@')[0],
      type: preset?.type || 'imap',
      ...settings,
      encryptedPassword: dto.password,
      connected: true,
    });

    // Pull the inbox in the background so sign-in returns quickly
    this.imapSyncService
      .syncAccount(account.id)
      .catch((err) => this.logger.warn(`Initial sync failed: ${err}`));

    return this.login(account);
  }

  async login(account: Account) {
    const payload = { email: account.email, sub: account.id };
    return {
      access_token: this.jwtService.sign(payload),
      account: {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        type: account.type,
        connected: account.connected,
      },
    };
  }

  /**
   * Signs in or links an OAuth provider (Google/Facebook).
   * If an account with the same email already exists, its OAuth tokens are
   * updated. Otherwise a new account is created with the provider's tokens.
   */
  async oauthLogin(params: {
    email: string;
    displayName: string;
    provider: 'google' | 'facebook';
    providerId: string;
    accessToken: string;
    refreshToken?: string;
  }) {
    const { email, displayName, provider, providerId, accessToken, refreshToken } = params;

    const existing = await this.accountService.findByEmail(email);

    if (existing) {
      const account = await this.accountService.update(existing.id, {
        type: provider,
        oauthProviderId: providerId,
        accessToken: encryptSecret(accessToken),
        refreshToken: refreshToken ? encryptSecret(refreshToken) : undefined,
        connected: true,
      });
      return this.login(account!);
    }

    const account = await this.accountService.create({
      email,
      displayName: displayName || email.split('@')[0],
      type: provider,
      oauthProviderId: providerId,
      accessToken: encryptSecret(accessToken),
      refreshToken: refreshToken ? encryptSecret(refreshToken) : undefined,
      connected: true,
    });

    return this.login(account);
  }

  async refreshToken(token: string) {
    try {
      const { email, sub } = this.jwtService.verify(token);
      return {
        access_token: this.jwtService.sign({ email, sub }),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
