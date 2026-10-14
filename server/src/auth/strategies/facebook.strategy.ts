import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { AuthService } from '../auth.service';

type VerifyCallback = (error: any, user?: any, info?: any) => void;

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
      callbackURL: process.env.FACEBOOK_CALLBACK_URL || `${process.env.API_URL || 'http://localhost:3000'}/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    const { id, displayName, emails } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new Error('Facebook account has no email address. Please allow email access.'), undefined);
    }

    try {
      const account = await this.authService.oauthLogin({
        email,
        displayName: displayName || email.split('@')[0],
        provider: 'facebook',
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
