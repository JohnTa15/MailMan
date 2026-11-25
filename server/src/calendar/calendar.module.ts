import { Module } from '@nestjs/common';
import { AccountsModule } from '../data/accounts/accounts.module';
import { OAuthCoreModule } from '../oauth/oauth-core.module';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

@Module({
  imports: [AccountsModule, OAuthCoreModule],
  providers: [CalendarService],
  controllers: [CalendarController],
  exports: [CalendarService],
})
export class CalendarModule {}
