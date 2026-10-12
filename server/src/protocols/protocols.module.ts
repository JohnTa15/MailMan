import { Module } from '@nestjs/common';
import { ImapModule } from './imap/imap.module';
import { SmtpModule } from './smtp/smtp.module';

@Module({
  imports: [ImapModule, SmtpModule],
})
export class ProtocolsModule {}
