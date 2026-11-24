import { Module } from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { AccountsModule } from '../../data/accounts/accounts.module';
import { EmailsModule } from '../../data/emails/emails.module';
import { OAuthCoreModule } from '../../oauth/oauth-core.module';

@Module({
  imports: [AccountsModule, EmailsModule, OAuthCoreModule],
  providers: [SmtpService],
  exports: [SmtpService],
})
export class SmtpModule {}
