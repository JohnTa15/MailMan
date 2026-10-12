import { Module } from '@nestjs/common';
import { ImapSyncService } from './imap.sync.service';
import { EmailsModule } from '../../data/emails/emails.module';
import { AccountsModule } from '../../data/accounts/accounts.module';

@Module({
  imports: [EmailsModule, AccountsModule],
  providers: [ImapSyncService],
  exports: [ImapSyncService],
})
export class ImapModule {}
