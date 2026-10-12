import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AccountService } from './accounts.service';
import { AccountController } from './accounts.controller';

@Module({
  imports: [DatabaseModule],
  providers: [AccountService],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountsModule {}
