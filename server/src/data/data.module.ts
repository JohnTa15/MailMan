import { Module } from '@nestjs/common';
import { DatabaseModule } from './database.module';
import { AccountService } from './accounts.service';
import { AccountController } from './accounts.controller';
import { EmailService } from './emails.service';
import { EmailController } from './emails.controller';
import { FolderService } from './folders.service';
import { FolderController } from './folders.controller';

@Module({
  imports: [DatabaseModule],
  providers: [AccountService, EmailService, FolderService],
  controllers: [AccountController, EmailController, FolderController],
})
export class DataModule {}
