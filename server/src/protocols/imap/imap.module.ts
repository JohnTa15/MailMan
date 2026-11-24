import { Module } from '@nestjs/common';
import { ImapSyncService } from './imap.sync.service';
import { SyncSchedulerService } from './sync-scheduler.service';
import { EmailsModule } from '../../data/emails/emails.module';
import { AccountsModule } from '../../data/accounts/accounts.module';
import { OAuthCoreModule } from '../../oauth/oauth-core.module';

@Module({
  imports: [EmailsModule, AccountsModule, OAuthCoreModule],
  providers: [ImapSyncService, SyncSchedulerService],
  exports: [ImapSyncService],
})
export class ImapModule {}
