import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { oauthCallbackUrl } from '../oauth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: oauthCallbackUrl('google'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, displayName, emails } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error('Google account has no email address'), undefined);
    }

    try {
      const account = await this.authService.oauthLogin({
        email,
        displayName: displayName || email.split('@')[0],
        provider: 'google',
        providerId: id,
        accessToken,
        refreshToken,
      });
      return done(null, account);
    } catch (error) {
      return done(error, undefined);
    }
  }
}
