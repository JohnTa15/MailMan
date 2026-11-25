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
import { MailCredentialsService } from '../oauth/mail-credentials.service';

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
  | 'id'
  | 'email'
  | 'displayName'
  | 'type'
  | 'authType'
  | 'connected'
  | 'imapHost'
  | 'smtpHost'
  | 'createdAt'
  | 'lastSyncAt'
  | 'syncError'
  | 'parentId'
> & { syncComplete: boolean; canAddShared: boolean };

/** Office 365 shared mailboxes open with a work or school Microsoft sign-in. */
const canAddShared = (a: Account) => a.type === 'outlook' && a.authType === 'oauth2' && !a.parentId;

/** Whether every folder has been fetched back to its first message. */
function syncComplete(a: Account): boolean {
  try {
    const folders = Object.values(JSON.parse(a.syncState || '{}')) as { complete?: boolean }[];
    return folders.length > 0 && folders.every((f) => f.complete);
  } catch {
    return false;
  }
}

export function toPublicMailbox(a: Account): PublicMailbox {
  return {
    lastSyncAt: a.lastSyncAt,
    syncError: a.syncError,
    syncComplete: syncComplete(a),
    id: a.id,
    email: a.email,
    displayName: a.displayName,
    type: a.type,
    authType: a.authType,
    connected: a.connected,
    imapHost: a.imapHost,
    smtpHost: a.smtpHost,
    createdAt: a.createdAt,
    parentId: a.parentId,
    canAddShared: canAddShared(a),
  };
}

@Injectable()
export class MailboxesService {
  private readonly logger = new Logger(MailboxesService.name);

  constructor(
    private readonly accountService: AccountService,
    private readonly emailService: EmailService,
    private readonly imapSyncService: ImapSyncService,
    private readonly mailCredentials: MailCredentialsService,
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

  /**
   * Adds an Office 365 shared mailbox (info@company.com) that the person
   * signed in to `parentId` has Full Access to. It opens with their sign-in.
   */
  async addShared(userId: string, parentId: string, address: string | undefined): Promise<Account> {
    const parent = await this.owned(userId, parentId);
    if (!canAddShared(parent)) {
      throw new BadRequestException('Shared mailboxes need a mailbox connected with "Sign in with Microsoft"');
    }
    const email = address?.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new BadRequestException('Enter the shared mailbox address');
    if (email === parent.email) throw new BadRequestException('That is the mailbox itself');
    const existing = await this.ensureAvailable(userId, email);
    if (existing && existing.userId === userId) throw new ConflictException(`${email} is already in Mailman`);

    const ok = await this.imapSyncService.verifyCredentials({
      host: parent.imapHost,
      port: parent.imapPort,
      secure: parent.imapSecure,
      user: email,
      accessToken: await this.mailCredentials.accessToken(parent),
    });
    if (!ok) {
      throw new BadRequestException(
        `${parent.email} can't open ${email}. Check the address, and that your Microsoft 365 admin gave you Full Access to it (it can take an hour to apply).`,
      );
    }
    const data: Partial<Account> = {
      userId,
      email,
      displayName: email.split('@')[0],
      type: 'outlook',
      authType: 'oauth2',
      parentId: parent.id,
      imapHost: parent.imapHost,
      imapPort: parent.imapPort,
      imapSecure: parent.imapSecure,
      smtpHost: parent.smtpHost,
      smtpPort: parent.smtpPort,
      smtpSecure: parent.smtpSecure,
      accessToken: null as unknown as string,
      refreshToken: null as unknown as string,
      encryptedPassword: null as unknown as string,
      connected: true,
    };
    const mailbox = existing ? (await this.accountService.update(existing.id, data))! : await this.accountService.create(data);
    this.syncInBackground(mailbox);
    return mailbox;
  }

  /** Removes a mailbox, its mail in Mailman, and shared mailboxes opened through it. */
  async remove(userId: string, id: string): Promise<void> {
    await this.owned(userId, id);
    const shared = (await this.list(userId)).filter((m) => m.parentId === id);
    for (const mailbox of [...shared.map((m) => m.id), id]) {
      await this.emailService.removeByAccount(mailbox);
      await this.accountService.remove(mailbox);
    }
  }

  /** Syncs one mailbox, or all of the user's; failures are reported per mailbox. */
  async sync(userId: string, mailboxId?: string) {
    const mailboxes = mailboxId ? [await this.owned(userId, mailboxId)] : await this.list(userId);
    let added = 0;
    const errors: { mailbox: string; message: string }[] = [];
    for (const mailbox of mailboxes) {
      try {
        // Quick: new mail only; the background scheduler does the backfill
        added += (await this.imapSyncService.syncAccount(mailbox.id, { newOnly: true })).added;
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
