import { Module } from '@nestjs/common';
import { AccountsModule } from '../data/accounts/accounts.module';
import { EmailsModule } from '../data/emails/emails.module';
import { ImapModule } from '../protocols/imap/imap.module';
import { MailboxesService } from './mailboxes.service';
import { MailboxesController } from './mailboxes.controller';

@Module({
  imports: [AccountsModule, EmailsModule, ImapModule],
  providers: [MailboxesService],
  controllers: [MailboxesController],
  exports: [MailboxesService],
})
export class MailboxesModule {}
