import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../database/entities/user.entity';
import { UsersService, toPublicUser } from '../users/users.service';
import { InvitesService } from '../users/invites.service';
import { AccountService } from '../data/accounts/accounts.service';
import { MailboxesService, toPublicMailbox } from '../mailboxes/mailboxes.service';
import { hashPassword, verifyPassword } from '../crypto/password';
import { OAuthIdentity } from '../oauth/oauth-client.service';
import { OAuthProvider, isOAuthConfigured } from '../oauth/providers';
import { AccessTokenPayload } from './jwt-auth.guard';

export interface SignupDto {
  email: string;
  password: string;
  displayName?: string;
  invite?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkPassword(password: string | undefined) {
  if (!password || password.length < 8) throw new BadRequestException('Use a password of at least 8 characters');
  if (password.length > 200) throw new BadRequestException('That password is too long');
}

@Injectable()
export class AuthService {
  // Compared against when the email is unknown, so both cases take as long
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly users: UsersService,
    private readonly invites: InvitesService,
    private readonly accounts: AccountService,
    private readonly mailboxes: MailboxesService,
  ) {}

  /** Public: what the sign-in screen should offer. */
  async status() {
    return {
      hasUsers: (await this.users.count()) > 0,
      providers: { google: isOAuthConfigured('google'), microsoft: isOAuthConfigured('microsoft') },
    };
  }

  issue(user: User) {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email, typ: 'access' };
    return { access_token: this.jwtService.sign(payload), user: toPublicUser(user) };
  }

  /** The first person becomes the admin; everyone after needs an invite. */
  async signup(dto: SignupDto) {
    const email = dto.email?.trim().toLowerCase();
    if (!email || !EMAIL_RE.test(email)) throw new BadRequestException('Enter a valid email address');
    checkPassword(dto.password);

    const { invite, role } = await this.admission(dto.invite);
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('An account with this email already exists. Sign in instead.');
    }
    const user = await this.users.create({
      email,
      displayName: dto.displayName?.trim().slice(0, 100) || email.split('@')[0],
      passwordHash: await hashPassword(dto.password),
      role,
    });
    await this.admitted(user, invite);
    return this.issue(user);
  }

  async login(email: string | undefined, password: string | undefined) {
    const user = email ? await this.users.findByEmail(email) : null;
    this.dummyHash ??= hashPassword('dummy-password');
    const ok = await verifyPassword(password || '', user?.passwordHash || (await this.dummyHash));
    if (!user || !user.passwordHash || !ok) {
      throw new UnauthorizedException('Wrong email or password');
    }
    return this.issue(user);
  }

  async me(userId: string) {
    const user = await this.requireUser(userId);
    const mailboxes = await this.mailboxes.list(userId);
    return { user: toPublicUser(user), mailboxes: mailboxes.map(toPublicMailbox) };
  }

  async updateMe(
    userId: string,
    dto: { displayName?: string; currentPassword?: string; newPassword?: string },
  ) {
    const user = await this.requireUser(userId);
    const changes: Partial<User> = {};
    if (dto.displayName !== undefined) changes.displayName = dto.displayName.trim().slice(0, 100) || null;
    if (dto.newPassword !== undefined) {
      checkPassword(dto.newPassword);
      // Google/Microsoft-only users may set a first password without one
      if (user.passwordHash && !(await verifyPassword(dto.currentPassword || '', user.passwordHash))) {
        throw new UnauthorizedException('Your current password is wrong');
      }
      changes.passwordHash = await hashPassword(dto.newPassword);
    }
    return toPublicUser((await this.users.update(userId, changes))!);
  }

  async refresh(token: string) {
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      const user = payload.typ === 'access' ? await this.users.findById(payload.sub) : null;
      if (!user) throw new Error('unknown user');
      return { access_token: this.issue(user).access_token };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * The user a Google/Microsoft sign-in belongs to, creating one when
   * allowed. Existing users are matched by the provider's account id;
   * only Google, which verifies addresses, may also match by email.
   */
  async oauthSignIn(provider: OAuthProvider, identity: OAuthIdentity, inviteCode?: string): Promise<User> {
    let user = await this.users.findByProviderSub(provider.id, identity.sub);
    if (user) return user;

    const byEmail = identity.email ? await this.users.findByEmail(identity.email) : null;
    if (byEmail) {
      if (provider.id === 'google' && identity.emailVerified && !byEmail.googleSub) {
        return (await this.users.update(byEmail.id, { googleSub: identity.sub }))!;
      }
      throw new ConflictException(
        `A Mailman account already uses ${identity.email}. Sign in with your password, ` +
          `then connect ${provider.label} from Settings.`,
      );
    }

    const { invite, role } = await this.admission(inviteCode, provider.label);
    if (!identity.email) throw new BadRequestException(`${provider.label} did not share an email address`);
    user = await this.users.create({
      email: identity.email,
      displayName: identity.name?.slice(0, 100) || identity.email.split('@')[0],
      passwordHash: null,
      role,
      ...(provider.id === 'google' ? { googleSub: identity.sub } : { microsoftSub: identity.sub }),
    });
    await this.admitted(user, invite);
    return user;
  }

  /** Lets "Continue with ..." sign this user in later, unless another user has it. */
  async linkProvider(userId: string, provider: OAuthProvider, identity: OAuthIdentity) {
    const user = await this.requireUser(userId);
    const field = provider.id === 'google' ? 'googleSub' : 'microsoftSub';
    if (user[field] || (await this.users.findByProviderSub(provider.id, identity.sub))) return;
    await this.users.update(userId, { [field]: identity.sub });
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async admission(inviteCode: string | undefined, via?: string) {
    if ((await this.users.count()) === 0) return { invite: null, role: 'admin' as const };
    const invite = await this.invites.findValid(inviteCode);
    if (!invite) {
      throw new ForbiddenException(
        via
          ? `No Mailman account is linked to this ${via} account. Ask the admin for an invite.`
          : 'This server is invite-only. Ask the admin for an invite code.',
      );
    }
    return { invite, role: 'user' as const };
  }

  private async admitted(user: User, invite: Awaited<ReturnType<InvitesService['findValid']>>) {
    if (invite) await this.invites.markUsed(invite, user.id);
    // Mailboxes from before user accounts existed belong to the first admin
    if (user.role === 'admin') await this.accounts.adoptOrphans(user.id);
  }
}
