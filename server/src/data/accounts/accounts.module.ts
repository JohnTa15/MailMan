import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AccountService } from './accounts.service';

@Module({
  imports: [DatabaseModule],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountsModule {}
