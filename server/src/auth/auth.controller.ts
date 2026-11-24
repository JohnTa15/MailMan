import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { AuthService, SignupDto } from './auth.service';
import { OAuthFlowService, OAuthMode } from './oauth-flow.service';
import { CurrentUser, JwtAuthGuard, userIdFromRequest } from './jwt-auth.guard';
import { RateLimiter } from './rate-limit';

// Password guessing: per address and per client
const loginByEmail = new RateLimiter(10, 15 * 60 * 1000);
const authByIp = new RateLimiter(30, 15 * 60 * 1000);

function clientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/** The address people reach this server at, for OAuth redirect URIs. */
function publicUrl(req: Request) {
  return (process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function resultPage(ok: boolean, message: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mailman</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,-apple-system,sans-serif;background:#f7f7fb;color:#0f1020}
@media (prefers-color-scheme:dark){body{background:#0b0d17;color:#eeeef5}.card{background:#15162a!important}}
.card{background:#fff;border-radius:24px;padding:40px 32px;max-width:420px;text-align:center;box-shadow:0 24px 64px -16px rgba(15,16,32,.25)}
.icon{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;margin:0 auto 16px;font-size:28px;color:#fff;background:${ok ? '#10b981' : '#f43f5e'}}
h1{font-size:20px;margin:0 0 8px}p{margin:0;color:#64647d}
</style></head><body><div class="card"><div class="icon">${ok ? '&#10003;' : '!'}</div>
<h1>${ok ? 'All set' : 'Something went wrong'}</h1><p>${escapeHtml(message)}</p></div></body></html>`;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthFlow: OAuthFlowService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('status')
  status() {
    return this.authService.status();
  }

  @Post('signup')
  async signup(@Req() req: Request, @Body() body: SignupDto) {
    authByIp.hit(clientIp(req));
    return this.authService.signup(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Body() body: { email?: string; password?: string }) {
    authByIp.hit(clientIp(req));
    loginByEmail.hit((body.email || '').trim().toLowerCase());
    return this.authService.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() userId: string) {
    return this.authService.me(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(
    @CurrentUser() userId: string,
    @Body() body: { displayName?: string; currentPassword?: string; newPassword?: string },
  ) {
    return this.authService.updateMe(userId, body);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body('token') token: string) {
    return this.authService.refresh(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return { success: true };
  }

  /** Starts Google/Microsoft: sign in (mode "signin") or add a mailbox (mode "connect", needs a token). */
  @Post('oauth/:provider/start')
  @HttpCode(HttpStatus.OK)
  startOAuth(
    @Req() req: Request,
    @Param('provider') provider: string,
    @Body() body: { mode?: OAuthMode; invite?: string },
  ) {
    authByIp.hit(clientIp(req));
    const mode = body.mode || 'signin';
    const userId = mode === 'connect' ? userIdFromRequest(this.jwtService, req) : null;
    if (mode === 'connect' && !userId) throw new UnauthorizedException();
    return this.oauthFlow.start(provider, mode, publicUrl(req), { userId: userId || undefined, invite: body.invite });
  }

  @Get('oauth/:provider/callback')
  async oauthCallback(
    @Param('provider') provider: string,
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ) {
    const { ok, message } = await this.oauthFlow.callback(provider, query);
    res.status(ok ? 200 : 400).type('html').send(resultPage(ok, message));
  }

  @Get('oauth/poll/:id')
  pollOAuth(@Param('id') id: string) {
    return this.oauthFlow.poll(id);
  }
}
