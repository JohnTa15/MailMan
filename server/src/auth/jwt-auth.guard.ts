import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

/** Claims in a sign-in token. `typ` keeps other signed tokens (OAuth state) from passing as one. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  typ: 'access';
}

/** The user id from a valid `Authorization: Bearer` access token, or null. */
export function userIdFromRequest(jwtService: JwtService, req: Request): string | null {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    const payload = jwtService.verify<AccessTokenPayload>(token);
    return payload.typ === 'access' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = userIdFromRequest(this.jwtService, req);
    if (!userId) throw new UnauthorizedException();
    req.userId = userId;
    return true;
  }
}

/** The id of the signed-in user. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().userId,
);
