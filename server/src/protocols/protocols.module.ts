import { Module } from '@nestjs/common';
import { ImapModule } from './imap/imap.module';
import { SmtpModule } from './smtp/smtp.module';
import { MailController } from './mail.controller';
import { MailboxesModule } from '../mailboxes/mailboxes.module';

@Module({
  imports: [ImapModule, SmtpModule, MailboxesModule],
  controllers: [MailController],
})
export class ProtocolsModule {}
