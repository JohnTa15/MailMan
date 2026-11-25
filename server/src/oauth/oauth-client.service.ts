import { Injectable } from '@nestjs/common';
import { OAuthProvider } from './providers';

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  idToken?: string;
  /** What the person actually allowed (Google lets them untick calendar) */
  scope?: string;
}

export interface OAuthIdentity {
  sub: string;
  email: string;
  /** Whether the provider vouches that the person owns this address */
  emailVerified: boolean;
  name?: string;
}

@Injectable()
export class OAuthClientService {
  buildAuthorizeUrl(provider: OAuthProvider, redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: provider.clientId()!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state,
      ...provider.authorizeParams,
    });
    return `${provider.authorizeUrl()}?${params}`;
  }

  exchangeCode(provider: OAuthProvider, code: string, redirectUri: string): Promise<TokenSet> {
    return this.tokenRequest(provider, {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });
  }

  /** A fresh token; `scopes` asks for another API (Microsoft Graph) with the same refresh token. */
  refresh(provider: OAuthProvider, refreshToken: string, scopes?: string[]): Promise<TokenSet> {
    return this.tokenRequest(provider, { grant_type: 'refresh_token', refresh_token: refreshToken }, scopes);
  }

  /**
   * Reads the identity from an ID token. It was received straight from the
   * provider's token endpoint over TLS in exchange for our client secret,
   * so its signature need not be checked (OpenID Connect Core 3.1.3.7);
   * the audience still must be us.
   */
  identityFromIdToken(provider: OAuthProvider, idToken: string | undefined): OAuthIdentity {
    if (!idToken) throw new Error(`${provider.label} did not return an ID token`);
    const claims = JSON.parse(Buffer.from(idToken.split('.')[1] || '', 'base64url').toString('utf8'));
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audience.includes(provider.clientId())) {
      throw new Error(`${provider.label} ID token was issued for another application`);
    }
    if (provider.id === 'google') {
      return {
        sub: String(claims.sub),
        email: String(claims.email || '').toLowerCase(),
        emailVerified: claims.email_verified === true || claims.email_verified === 'true',
        name: claims.name,
      };
    }
    // Microsoft: oid is stable across apps; the address may be in email or preferred_username.
    // Its email claim is not verified, so it is never used to match existing users.
    return {
      sub: String(claims.oid || claims.sub),
      email: String(claims.email || claims.preferred_username || '').toLowerCase(),
      emailVerified: false,
      name: claims.name,
    };
  }

  private async tokenRequest(provider: OAuthProvider, params: Record<string, string>, scopes?: string[]): Promise<TokenSet> {
    const tokenScopes = scopes || provider.tokenScopes || provider.scopes;
    const body = new URLSearchParams({
      ...params,
      client_id: provider.clientId()!,
      client_secret: provider.clientSecret()!,
      ...(provider.scopeOnTokenRequest || scopes ? { scope: tokenScopes.join(' ') } : {}),
    });
    const res = await fetch(provider.tokenUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof data.access_token !== 'string') {
      const reason = data.error_description || data.error || `HTTP ${res.status}`;
      throw new Error(`${provider.label} token request failed: ${reason}`);
    }
    return {
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
      expiresAt: new Date(Date.now() + (Number(data.expires_in) || 3600) * 1000),
      idToken: typeof data.id_token === 'string' ? data.id_token : undefined,
      scope: typeof data.scope === 'string' ? data.scope : undefined,
    };
  }
}
