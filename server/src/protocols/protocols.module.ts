import { Module } from '@nestjs/common';
import { ImapModule } from './imap/imap.module';
import { SmtpModule } from './smtp/smtp.module';
import { MailController } from './mail.controller';

@Module({
  imports: [ImapModule, SmtpModule],
  controllers: [MailController],
})
export class ProtocolsModule {}
