import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Account } from '../database/entities/account.entity';
import { AccountService } from '../data/accounts/accounts.service';
import { EmailService } from '../data/emails/emails.service';
import { encryptSecret } from '../crypto/secret-box';
import { ImapSyncService } from '../protocols/imap/imap.sync.service';
import { discoverProvider } from '../protocols/providers';
import { OAuthIdentity, TokenSet } from '../oauth/oauth-client.service';
import { OAuthProvider } from '../oauth/providers';

export interface PasswordMailboxDto {
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

export type PublicMailbox = Pick<
  Account,
  'id' | 'email' | 'displayName' | 'type' | 'authType' | 'connected' | 'imapHost' | 'smtpHost' | 'createdAt'
>;

export function toPublicMailbox(a: Account): PublicMailbox {
  return {
    id: a.id,
    email: a.email,
    displayName: a.displayName,
    type: a.type,
    authType: a.authType,
    connected: a.connected,
    imapHost: a.imapHost,
    smtpHost: a.smtpHost,
    createdAt: a.createdAt,
  };
}

@Injectable()
export class MailboxesService {
  private readonly logger = new Logger(MailboxesService.name);

  constructor(
    private readonly accountService: AccountService,
    private readonly emailService: EmailService,
    private readonly imapSyncService: ImapSyncService,
  ) {}

  list(userId: string): Promise<Account[]> {
    return this.accountService.findByUser(userId);
  }

  /** The mailbox if it belongs to the user; 404 otherwise, so ids don't leak. */
  async owned(userId: string, id: string): Promise<Account> {
    const mailbox = id ? await this.accountService.findOne(id) : null;
    if (!mailbox || mailbox.userId !== userId) throw new NotFoundException('Mailbox not found');
    return mailbox;
  }

  /** Connects a mailbox with its IMAP password or app password. */
  async connectWithPassword(userId: string, dto: PasswordMailboxDto): Promise<Account> {
    const email = dto.email?.trim().toLowerCase();
    if (!email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }
    const existing = await this.ensureAvailable(userId, email);

    const preset = discoverProvider(email);
    const imapHost = dto.imapHost || preset?.imapHost;
    const smtpHost = dto.smtpHost || preset?.smtpHost;
    if (!imapHost || !smtpHost) {
      throw new BadRequestException('Could not detect your mail server. Enter the IMAP and SMTP settings.');
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
      throw new UnauthorizedException(
        'Your mail server rejected the sign-in. Check the password (Gmail, Yahoo and iCloud need an app password) and server settings.',
      );
    }

    const data: Partial<Account> = {
      ...settings,
      displayName: dto.displayName || existing?.displayName || email.split('@')[0],
      type: preset?.type || 'imap',
      authType: 'password',
      encryptedPassword: dto.password,
      accessToken: null as unknown as string,
      refreshToken: null as unknown as string,
      tokenExpiresAt: null,
      connected: true,
    };
    const mailbox = existing
      ? (await this.accountService.update(existing.id, data))!
      : await this.accountService.create({ ...data, userId, email });
    this.syncInBackground(mailbox);
    return mailbox;
  }

  /** Connects (or reconnects) the mailbox a Google/Microsoft sign-in grants access to. */
  async connectWithOAuth(
    userId: string,
    provider: OAuthProvider,
    identity: OAuthIdentity,
    tokens: TokenSet,
  ): Promise<Account> {
    const email = identity.email;
    if (!email) throw new BadRequestException(`${provider.label} did not share an email address`);
    const existing = await this.ensureAvailable(userId, email);

    const ok = await this.imapSyncService.verifyCredentials({
      host: provider.imap.host,
      port: provider.imap.port,
      secure: provider.imap.secure,
      user: email,
      accessToken: tokens.accessToken,
    });
    if (!ok) {
      throw new BadRequestException(
        `${provider.label} accepted the sign-in, but its mail server refused IMAP access for ${email}. ` +
          'Check that IMAP is enabled for this mailbox.',
      );
    }

    const refreshToken = tokens.refreshToken
      ? encryptSecret(tokens.refreshToken)
      : existing?.authType === 'oauth2'
        ? existing.refreshToken
        : null;
    if (!refreshToken) {
      throw new BadRequestException(`${provider.label} did not allow offline access. Try connecting again.`);
    }

    const data: Partial<Account> = {
      displayName: existing?.displayName || identity.name || email.split('@')[0],
      type: provider.mailboxType,
      authType: 'oauth2',
      imapHost: provider.imap.host,
      imapPort: provider.imap.port,
      imapSecure: provider.imap.secure,
      smtpHost: provider.smtp.host,
      smtpPort: provider.smtp.port,
      smtpSecure: provider.smtp.secure,
      oauthProviderId: identity.sub,
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      encryptedPassword: null as unknown as string,
      connected: true,
    };
    const mailbox = existing
      ? (await this.accountService.update(existing.id, data))!
      : await this.accountService.create({ ...data, userId, email });
    this.syncInBackground(mailbox);
    return mailbox;
  }

  async rename(userId: string, id: string, displayName: string | undefined): Promise<Account> {
    await this.owned(userId, id);
    return (await this.accountService.update(id, { displayName: displayName?.trim().slice(0, 100) || undefined }))!;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.owned(userId, id);
    await this.emailService.removeByAccount(id);
    await this.accountService.remove(id);
  }

  /** Syncs one mailbox, or all of the user's; failures are reported per mailbox. */
  async sync(userId: string, mailboxId?: string) {
    const mailboxes = mailboxId ? [await this.owned(userId, mailboxId)] : await this.list(userId);
    let added = 0;
    const errors: { mailbox: string; message: string }[] = [];
    for (const mailbox of mailboxes) {
      try {
        added += await this.imapSyncService.syncAccount(mailbox.id);
      } catch (err) {
        errors.push({ mailbox: mailbox.email, message: err instanceof Error ? err.message : String(err) });
      }
    }
    return { added, errors };
  }

  /** The mailbox with this address if the user already has it; refuses someone else's. */
  private async ensureAvailable(userId: string, email: string): Promise<Account | null> {
    const existing = await this.accountService.findByEmail(email);
    if (existing && existing.userId && existing.userId !== userId) {
      throw new ConflictException(`${email} is already connected to another Mailman user`);
    }
    return existing;
  }

  private syncInBackground(mailbox: Account) {
    this.imapSyncService
      .syncAccount(mailbox.id)
      .catch((err) => this.logger.warn(`Initial sync of ${mailbox.email} failed: ${err}`));
  }
}
