import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

/** Use after JwtAuthGuard: only admins pass. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.userId ? await this.usersService.findById(req.userId) : null;
    if (user?.role !== 'admin') throw new ForbiddenException('Only an admin can do this');
    return true;
  }
}
