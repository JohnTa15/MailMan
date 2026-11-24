import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { OAuthClientService } from '../oauth/oauth-client.service';
import { OAuthProvider, getOAuthProvider, isOAuthConfigured, OAuthProviderId } from '../oauth/providers';
import { MailboxesService, toPublicMailbox } from '../mailboxes/mailboxes.service';
import { AuthService } from './auth.service';

export type OAuthMode = 'signin' | 'connect';

interface StatePayload {
  typ: 'oauth-state';
  p: OAuthProviderId;
  m: OAuthMode;
  u?: string;
  i?: string;
  poll: string;
  r: string;
}

interface PollEntry {
  status: 'pending' | 'done' | 'error';
  result?: Record<string, unknown>;
  message?: string;
  expiresAt: number;
}

const TTL_MS = 10 * 60 * 1000;

/**
 * Google/Microsoft sign-in that works the same in the browser, the desktop
 * app and the Android app: the app opens the provider's page, then polls
 * with a secret id until the callback has finished. No deep links needed.
 */
@Injectable()
export class OAuthFlowService {
  private readonly logger = new Logger(OAuthFlowService.name);
  private readonly polls = new Map<string, PollEntry>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly oauthClient: OAuthClientService,
    private readonly authService: AuthService,
    private readonly mailboxes: MailboxesService,
  ) {}

  start(providerId: string, mode: OAuthMode, publicUrl: string, opts: { userId?: string; invite?: string }) {
    const provider = this.configured(providerId);
    if (mode !== 'signin' && mode !== 'connect') throw new BadRequestException('Unknown mode');
    this.sweep();

    const pollId = randomBytes(24).toString('base64url');
    const redirectUri = `${publicUrl}/api/auth/oauth/${provider.id}/callback`;
    const payload: StatePayload = {
      typ: 'oauth-state',
      p: provider.id,
      m: mode,
      ...(opts.userId ? { u: opts.userId } : {}),
      ...(opts.invite ? { i: opts.invite.trim().slice(0, 64) } : {}),
      poll: pollId,
      r: redirectUri,
    };
    const state = this.jwtService.sign(payload, { expiresIn: '10m' });
    this.polls.set(pollId, { status: 'pending', expiresAt: Date.now() + TTL_MS });
    return { url: this.oauthClient.buildAuthorizeUrl(provider, redirectUri, state), pollId };
  }

  /** Handles the provider's redirect; returns the message for the browser tab. */
  async callback(providerId: string, query: Record<string, string | undefined>): Promise<{ ok: boolean; message: string }> {
    let state: StatePayload;
    try {
      state = this.jwtService.verify<StatePayload>(query.state || '');
      if (state.typ !== 'oauth-state' || state.p !== providerId) throw new Error('mismatch');
    } catch {
      return { ok: false, message: 'This sign-in link has expired. Start again from Mailman.' };
    }
    const entry = this.polls.get(state.poll);
    if (!entry || entry.status !== 'pending') {
      return { ok: false, message: 'This sign-in was already used or has expired. Start again from Mailman.' };
    }

    try {
      if (query.error) {
        throw new Error(query.error === 'access_denied' ? 'You cancelled the sign-in.' : query.error_description || query.error);
      }
      if (!query.code) throw new Error('The provider did not return an authorization code.');
      const provider = this.configured(state.p);
      const tokens = await this.oauthClient.exchangeCode(provider, query.code, state.r);
      const identity = this.oauthClient.identityFromIdToken(provider, tokens.idToken);

      if (state.m === 'signin') {
        const user = await this.authService.oauthSignIn(provider, identity, state.i);
        const result: Record<string, unknown> = this.authService.issue(user);
        try {
          await this.mailboxes.connectWithOAuth(user.id, provider, identity, tokens);
        } catch (err) {
          // Signed in all the same; the app shows why the mailbox is missing
          result.mailboxError = err instanceof Error ? err.message : String(err);
        }
        this.finish(state.poll, { status: 'done', result });
      } else {
        if (!state.u) throw new Error('Sign in to Mailman first.');
        const mailbox = await this.mailboxes.connectWithOAuth(state.u, provider, identity, tokens);
        await this.authService.linkProvider(state.u, provider, identity);
        this.finish(state.poll, { status: 'done', result: { mailbox: toPublicMailbox(mailbox) } });
      }
      return { ok: true, message: `Connected to ${provider.label}. You can close this window and return to Mailman.` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`OAuth ${providerId} failed: ${message}`);
      this.finish(state.poll, { status: 'error', message });
      return { ok: false, message };
    }
  }

  /** Pending until the callback finishes; the final answer is handed out once. */
  poll(pollId: string) {
    const entry = this.polls.get(pollId);
    if (!entry || entry.expiresAt < Date.now()) throw new NotFoundException('Unknown or expired sign-in');
    if (entry.status === 'pending') return { status: 'pending' };
    this.polls.delete(pollId);
    return entry.status === 'done' ? { status: 'done', ...entry.result } : { status: 'error', message: entry.message };
  }

  private finish(pollId: string, update: Omit<PollEntry, 'expiresAt'>) {
    const entry = this.polls.get(pollId);
    if (entry) this.polls.set(pollId, { ...update, expiresAt: entry.expiresAt });
  }

  private configured(providerId: string): OAuthProvider {
    const provider = getOAuthProvider(providerId);
    if (!provider || !isOAuthConfigured(provider.id)) {
      throw new NotFoundException(`${providerId} sign-in is not configured on this server`);
    }
    return provider;
  }

  private sweep() {
    const now = Date.now();
    for (const [id, entry] of this.polls) if (entry.expiresAt < now) this.polls.delete(id);
  }
}
