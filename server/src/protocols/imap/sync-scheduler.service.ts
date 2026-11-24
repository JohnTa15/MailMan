import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AccountService } from '../../data/accounts/accounts.service';
import { ImapSyncService } from './imap.sync.service';

/**
 * Keeps every connected mailbox up to date in the background: each tick
 * (SYNC_INTERVAL_SECONDS, default 60) fetches new mail and, until the whole
 * mailbox is downloaded, one more batch of older mail. Mailboxes are synced
 * one at a time to stay light on small servers.
 */
@Injectable()
export class SyncSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;

  constructor(
    private readonly accounts: AccountService,
    private readonly imapSync: ImapSyncService,
  ) {}

  onModuleInit() {
    const seconds = Number(process.env.SYNC_INTERVAL_SECONDS ?? 60);
    if (seconds <= 0) return;
    this.timer = setInterval(() => this.tick(), seconds * 1000);
    // First pass shortly after startup
    setTimeout(() => this.tick(), 5000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const mailboxes = (await this.accounts.findAll()).filter((m) => m.connected && m.imapHost && m.userId);
      for (const mailbox of mailboxes) {
        try {
          const { added, pending } = await this.imapSync.syncAccount(mailbox.id);
          if (added) this.logger.log(`${mailbox.email}: ${added} new message(s)${pending ? ', more to fetch' : ''}`);
        } catch (err) {
          this.logger.warn(`Sync of ${mailbox.email} failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    } finally {
      this.ticking = false;
    }
  }
}
