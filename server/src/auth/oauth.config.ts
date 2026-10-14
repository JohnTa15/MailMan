import { CanActivate, NotFoundException } from '@nestjs/common';

export type OAuthProvider = 'google' | 'facebook';

const ENV_PREFIX: Record<OAuthProvider, string> = {
  google: 'GOOGLE',
  facebook: 'FACEBOOK',
};

/** A provider is enabled only when both its client ID and secret are set. */
export function isOAuthConfigured(provider: OAuthProvider): boolean {
  const prefix = ENV_PREFIX[provider];
  return !!(process.env[`${prefix}_CLIENT_ID`] && process.env[`${prefix}_CLIENT_SECRET`]);
}

export function oauthCallbackUrl(provider: OAuthProvider): string {
  return (
    process.env[`${ENV_PREFIX[provider]}_CALLBACK_URL`] ||
    `${process.env.API_URL || 'http://localhost:3001/api'}/auth/${provider}/callback`
  );
}

/** Answers 404 for a provider that is not configured instead of a 500. */
export class OAuthConfiguredGuard implements CanActivate {
  constructor(private readonly provider: OAuthProvider) {}

  canActivate(): boolean {
    if (!isOAuthConfigured(this.provider)) {
      throw new NotFoundException(`${this.provider} sign-in is not configured on this server`);
    }
    return true;
  }
}
