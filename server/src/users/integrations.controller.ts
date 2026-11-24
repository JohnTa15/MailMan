import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { publicUrl } from '../auth/public-url';
import { OAUTH_PROVIDERS } from '../oauth/providers';
import { AdminGuard } from './admin.guard';

/**
 * What an admin needs to set up Google and Microsoft sign-in: which settings
 * are present (never their values) and the redirect URI to register.
 */
@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, AdminGuard)
export class IntegrationsController {
  @Get()
  list(@Req() req: Request) {
    const base = publicUrl(req);
    const env = (name: string) => !!process.env[name]?.trim();
    return {
      publicUrl: base,
      publicUrlSet: env('PUBLIC_URL'),
      // OAuth providers only accept https redirect URIs (localhost aside)
      publicUrlSecure: base.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(base),
      providers: Object.values(OAUTH_PROVIDERS).map((p) => {
        const prefix = p.id.toUpperCase();
        return {
          id: p.id,
          label: p.label,
          configured: !!(p.clientId() && p.clientSecret()),
          clientIdVar: `${prefix}_CLIENT_ID`,
          clientSecretVar: `${prefix}_CLIENT_SECRET`,
          clientIdSet: env(`${prefix}_CLIENT_ID`),
          clientSecretSet: env(`${prefix}_CLIENT_SECRET`),
          redirectUri: `${base}/api/auth/oauth/${p.id}/callback`,
          ...(p.id === 'microsoft' ? { tenant: process.env.MICROSOFT_TENANT || 'common' } : {}),
        };
      }),
    };
  }
}
