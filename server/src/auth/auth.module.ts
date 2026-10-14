import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AccountsModule } from '../data/accounts/accounts.module';
import { ImapModule } from '../protocols/imap/imap.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { isOAuthConfigured } from './oauth.config';

@Module({
  imports: [
    AccountsModule,
    ImapModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  providers: [
    AuthService,
    // Passport strategies throw without credentials, so register only configured ones
    ...(isOAuthConfigured('google') ? [GoogleStrategy] : []),
    ...(isOAuthConfigured('facebook') ? [FacebookStrategy] : []),
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
