import { Module } from '@nestjs/common';
import { SmtpService } from './smtp.service';
import { AccountsModule } from '../../data/accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  providers: [SmtpService],
  exports: [SmtpService],
})
export class SmtpModule {}
