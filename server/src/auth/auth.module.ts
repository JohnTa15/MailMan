import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OAuthFlowService } from './oauth-flow.service';
import { AccountsModule } from '../data/accounts/accounts.module';
import { MailboxesModule } from '../mailboxes/mailboxes.module';
import { OAuthCoreModule } from '../oauth/oauth-core.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AccountsModule,
    MailboxesModule,
    OAuthCoreModule,
    UsersModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [AuthService, OAuthFlowService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
