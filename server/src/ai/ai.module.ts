import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AccountsModule } from '../data/accounts/accounts.module';
import { EmailsModule } from '../data/emails/emails.module';
import { ApiKeysService } from './api-keys.service';
import { McpToolsService } from './mcp-tools.service';
import { AiController } from './ai.controller';
import { McpController } from './mcp.controller';

@Module({
  imports: [DatabaseModule, AccountsModule, EmailsModule],
  providers: [ApiKeysService, McpToolsService],
  controllers: [AiController, McpController],
})
export class AiModule {}
