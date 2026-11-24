import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './data/accounts/accounts.module';
import { EmailsModule } from './data/emails/emails.module';
import { FoldersModule } from './data/folders/folders.module';
import { SecurityModule } from './security/security.module';
import { ProtocolsModule } from './protocols/protocols.module';
import { PluginsModule } from './plugins/plugins.module';
import { UsersModule } from './users/users.module';
import { MailboxesModule } from './mailboxes/mailboxes.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SecurityModule,
    AuthModule,
    UsersModule,
    MailboxesModule,
    AccountsModule,
    EmailsModule,
    FoldersModule,
    ProtocolsModule,
    PluginsModule,
    AiModule,
  ],
})
export class AppModule {}
