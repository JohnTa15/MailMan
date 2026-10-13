import { Module } from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { AccountsModule } from '../../data/accounts/accounts.module';
import { EmailsModule } from '../../data/emails/emails.module';

@Module({
  imports: [AccountsModule, EmailsModule],
  providers: [SmtpService],
  exports: [SmtpService],
})
export class SmtpModule {}
