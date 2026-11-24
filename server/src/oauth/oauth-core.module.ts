import { Module } from '@nestjs/common';
import { AccountsModule } from '../data/accounts/accounts.module';
import { OAuthClientService } from './oauth-client.service';
import { MailCredentialsService } from './mail-credentials.service';

@Module({
  imports: [AccountsModule],
  providers: [OAuthClientService, MailCredentialsService],
  exports: [OAuthClientService, MailCredentialsService],
})
export class OAuthCoreModule {}
