import { Injectable, Logger } from '@nestjs/common';
import { ImapFlow, ListResponse } from 'imapflow';
import { simpleParser } from 'mailparser';
import { EmailService } from '../../data/emails/emails.service';
import { AccountService } from '../../data/accounts/accounts.service';
import { Account } from '../../database/entities/account.entity';
import { MailCredentialsService } from '../../oauth/mail-credentials.service';

/** Messages fetched per folder in one pass; the rest follow on later passes. */
const BATCH = 200;
/** Bytes downloaded per message: full text, without large attachments. */
const MAX_SOURCE_BYTES = 1_000_000;

export interface ImapCredentials {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  /** Either a password or an OAuth access token (XOAUTH2) */
  pass?: string;
  accessToken?: string;
}

interface FolderState {
  uidValidity: string;
  /** Newest UID fetched: later ones are new mail */
  highestUid: number;
  /** Oldest UID fetched: earlier ones are still to backfill */
  lowestUid: number;
  complete: boolean;
}

type SyncState = Record<string, FolderState>;

export interface SyncResult {
  added: number;
  /** More messages are waiting (backfill not finished) */
  pending: boolean;
}

/** Which of our folders an IMAP folder feeds, in sync order. */
const FOLDER_ORDER: { folder: string; specialUse?: string }[] = [
  { folder: 'inbox' },
  { folder: 'sent', specialUse: '\\Sent' },
  { folder: 'drafts', specialUse: '\\Drafts' },
  { folder: 'spam', specialUse: '\\Junk' },
  { folder: 'trash', specialUse: '\\Trash' },
  { folder: 'archive', specialUse: '\\Archive' },
];

@Injectable()
export class ImapSyncService {
  private readonly logger = new Logger(ImapSyncService.name);
  /** Mailboxes being synced right now; a second request waits for the first */
  private readonly running = new Map<string, Promise<SyncResult>>();

  constructor(
    private readonly emailService: EmailService,
    private readonly accountService: AccountService,
    private readonly mailCredentials: MailCredentialsService,
  ) {}

  /** Returns true when the server accepts the login. */
  async verifyCredentials(creds: ImapCredentials): Promise<boolean> {
    const client = new ImapFlow({
      host: creds.host,
      port: creds.port,
      secure: creds.secure,
      auth: creds.accessToken
        ? { user: creds.user, accessToken: creds.accessToken }
        : { user: creds.user, pass: creds.pass },
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

  /**
   * Fetches new mail, then continues backfilling older mail one batch per
   * folder. Call again while `pending` to eventually hold every message.
   * With `newOnly`, skips the backfill (quick refresh).
   */
  syncAccount(accountId: string, opts: { newOnly?: boolean } = {}): Promise<SyncResult> {
    const current = this.running.get(accountId);
    if (current) return current;
    const run = this.doSync(accountId, opts).finally(() => this.running.delete(accountId));
    this.running.set(accountId, run);
    return run;
  }

  private async doSync(accountId: string, opts: { newOnly?: boolean }): Promise<SyncResult> {
    const account = await this.accountService.findOne(accountId);
    if (!account || !account.connected || !account.imapHost) return { added: 0, pending: false };

    let state: SyncState = {};
    try {
      state = JSON.parse(account.syncState || '{}');
    } catch {
      state = {};
    }

    const client = new ImapFlow({
      host: account.imapHost,
      port: account.imapPort || 993,
      secure: account.imapSecure,
      auth: await this.mailCredentials.imapAuth(account),
      logger: false,
    });

    let added = 0;
    let pending = false;
    try {
      await client.connect();
      for (const { path, folder } of await this.foldersToSync(client)) {
        const result = await this.syncFolder(client, account, path, folder, state, !!opts.newOnly);
        added += result.added;
        pending ||= result.pending;
        await this.accountService.update(account.id, { syncState: JSON.stringify(state) });
      }
      await this.accountService.update(account.id, { lastSyncAt: new Date(), syncError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.accountService.update(account.id, { syncError: message.slice(0, 500) });
      throw err;
    } finally {
      await client.logout().catch(() => client.close());
    }
    return { added, pending };
  }

  /** INBOX plus the special folders the server marks (or names) Sent, Drafts, Junk, Trash, Archive. */
  private async foldersToSync(client: ImapFlow): Promise<{ path: string; folder: string }[]> {
    const list: ListResponse[] = await client.list();
    const selectable = list.filter((f) => !f.flags.has('\\Noselect') && !f.flags.has('\\NonExistent'));
    const result: { path: string; folder: string }[] = [];
    for (const { folder, specialUse } of FOLDER_ORDER) {
      let match = specialUse
        ? selectable.find((f) => f.specialUse === specialUse)
        : selectable.find((f) => f.path.toUpperCase() === 'INBOX');
      // Gmail has no Archive folder: archived mail lives only in All Mail.
      // It also holds inbox and sent copies, which the Message-ID check skips.
      if (!match && folder === 'archive') match = selectable.find((f) => f.specialUse === '\\All');
      if (match) result.push({ path: match.path, folder });
    }
    return result;
  }

  private async syncFolder(
    client: ImapFlow,
    account: Account,
    path: string,
    folder: string,
    state: SyncState,
    newOnly: boolean,
  ): Promise<SyncResult> {
    const lock = await client.getMailboxLock(path, { readOnly: true });
    try {
      const mailbox = client.mailbox;
      if (!mailbox) return { added: 0, pending: false };
      const uidValidity = String(mailbox.uidValidity);
      let st = state[path];
      if (!st || st.uidValidity !== uidValidity) {
        // New folder, or the server renumbered it: start over (duplicates are skipped)
        st = { uidValidity, highestUid: 0, lowestUid: 0, complete: false };
      }
      state[path] = st;
      if (mailbox.exists === 0) {
        st.complete = true;
        return { added: 0, pending: false };
      }

      const uids = ((await client.search({ all: true }, { uid: true })) || []).sort((a, b) => a - b);
      let added = 0;

      // New mail: oldest first, so a long gap fills in without holes
      if (st.highestUid > 0) {
        const fresh = uids.filter((u) => u > st.highestUid).slice(0, BATCH);
        if (fresh.length) {
          added += await this.fetchAndStore(client, account, path, folder, fresh);
          st.highestUid = fresh[fresh.length - 1];
        }
      }

      // Backfill: newest of the remaining older messages first
      const older = st.lowestUid > 0 ? uids.filter((u) => u < st.lowestUid) : uids;
      if (!newOnly && older.length) {
        const batch = older.slice(-BATCH);
        added += await this.fetchAndStore(client, account, path, folder, batch);
        st.lowestUid = batch[0];
        st.highestUid = Math.max(st.highestUid, batch[batch.length - 1]);
      }
      const remainingOlder = st.lowestUid > 0 ? uids.filter((u) => u < st.lowestUid).length : uids.length;
      const remainingNew = uids.filter((u) => u > st.highestUid).length;
      st.complete = remainingOlder === 0;
      return { added, pending: remainingOlder > 0 || remainingNew > 0 };
    } finally {
      lock.release();
    }
  }

  /** Downloads the messages with these UIDs and stores the ones not seen before. */
  private async fetchAndStore(
    client: ImapFlow,
    account: Account,
    path: string,
    folder: string,
    uids: number[],
  ): Promise<number> {
    let added = 0;
    const messages = client.fetch(
      uids.join(','),
      { uid: true, flags: true, envelope: true, internalDate: true, size: true, source: { maxLength: MAX_SOURCE_BYTES } },
      { uid: true },
    );
    for await (const message of messages) {
      try {
        if (await this.emailService.findByImapLocation(account.id, path, message.uid)) continue;
        const messageId = message.envelope?.messageId;
        if (messageId && (await this.emailService.findByMessageId(account.id, messageId))) continue;
        if (!message.source) continue;

        // A truncated source still parses: headers and text come first
        const parsed = await simpleParser(message.source);
        const sender = parsed.from?.value[0];
        const text = parsed.text || '';
        const truncated = (message.size || 0) > MAX_SOURCE_BYTES;
        const flags = message.flags || new Set<string>();
        await this.emailService.create({
          accountId: account.id,
          imapFolder: path,
          imapUid: message.uid,
          messageId,
          subject: parsed.subject || message.envelope?.subject || '(No Subject)',
          from: sender?.address || '',
          fromName: sender?.name || '',
          to: parsed.to ? [parsed.to].flat().map((a) => a.text).join(', ') : '',
          date: parsed.date || message.envelope?.date || new Date(message.internalDate || Date.now()),
          body: truncated ? `${text}\n\n[Large message: attachments were not downloaded]` : text,
          html: parsed.html || undefined,
          preview: text.replace(/\s+/g, ' ').trim().slice(0, 200),
          folder,
          isRead: flags.has('\\Seen'),
          isStarred: flags.has('\\Flagged'),
        });
        added++;
      } catch (err) {
        this.logger.warn(`Skipped message ${message.uid} in ${path} for ${account.email}: ${err}`);
      }
    }
    return added;
  }
}
