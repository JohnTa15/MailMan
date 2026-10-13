import { Injectable, Logger } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { EmailService } from '../../data/emails/emails.service';
import { AccountService } from '../../data/accounts/accounts.service';
import { Email } from '../../database/entities/email.entity';
import { decryptSecret } from '../../crypto/secret-box';

const SYNC_LIMIT = 100;

export interface ImapCredentials {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

@Injectable()
export class ImapSyncService {
  private readonly logger = new Logger(ImapSyncService.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly accountService: AccountService,
  ) {}

  /** Returns true when the server accepts the login. */
  async verifyCredentials(creds: ImapCredentials): Promise<boolean> {
    const client = new ImapFlow({
      host: creds.host,
      port: creds.port,
      secure: creds.secure,
      auth: { user: creds.user, pass: creds.pass },
      logger: false,
    });
    try {
      await client.connect();
      await client.logout();
      return true;
    } catch (err) {
      this.logger.warn(`IMAP login failed for ${creds.user}@${creds.host}: ${err}`);
      return false;
    }
  }

  async syncAccount(accountId: string): Promise<number> {
    const account = await this.accountService.findOne(accountId);
    if (!account || !account.connected || !account.imapHost) return 0;

    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort || 993,
      secure: account.imapSecure,
      auth: {
        user: account.email,
        pass: decryptSecret(account.encryptedPassword),
      },
      logger: false,
    });

    const emails: Partial<Email>[] = [];
    await client.connect();
    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        const mailbox = client.mailbox;
        const total = mailbox ? mailbox.exists : 0;
        if (total === 0) return 0;

        const range = `${Math.max(1, total - SYNC_LIMIT + 1)}:*`;
        for await (const message of client.fetch(range, { envelope: true, source: true })) {
          const messageId = message.envelope?.messageId;
          if (messageId && (await this.emailService.findByMessageId(accountId, messageId))) {
            continue;
          }
          if (!message.source) continue;

          const parsed = await simpleParser(message.source);
          const sender = parsed.from?.value[0];
          const text = parsed.text || '';
          emails.push({
            accountId,
            messageId,
            subject: parsed.subject || '(No Subject)',
            from: sender?.address || '',
            fromName: sender?.name || '',
            to: parsed.to ? [parsed.to].flat().map((a) => a.text).join(', ') : '',
            date: parsed.date || new Date(),
            body: text,
            html: parsed.html || undefined,
            preview: text.replace(/\s+/g, ' ').trim().slice(0, 200),
            folder: 'inbox',
          });
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch((err) => this.logger.warn(`IMAP logout failed: ${err}`));
    }

    for (const email of emails) {
      await this.emailService.create(email);
    }
    return emails.length;
  }
}
