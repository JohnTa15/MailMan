import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';

export type PublicUser = Pick<User, 'id' | 'email' | 'displayName' | 'role' | 'createdAt'> & {
  hasPassword: boolean;
  google: boolean;
  microsoft: boolean;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt: user.createdAt,
    hasPassword: !!user.passwordHash,
    google: !!user.googleSub,
    microsoft: !!user.microsoftSub,
  };
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  count(): Promise<number> {
    return this.users.count();
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findByProviderSub(provider: 'google' | 'microsoft', sub: string): Promise<User | null> {
    return this.users.findOne({ where: provider === 'google' ? { googleSub: sub } : { microsoftSub: sub } });
  }

  create(data: Partial<User>): Promise<User> {
    return this.users.save(this.users.create({ ...data, email: data.email!.trim().toLowerCase() }));
  }

  async update(id: string, changes: Partial<User>): Promise<User | null> {
    await this.users.update(id, changes);
    return this.findById(id);
  }
}
