import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Invite } from '../database/entities/invite.entity';

@Injectable()
export class InvitesService {
  constructor(@InjectRepository(Invite) private readonly invites: Repository<Invite>) {}

  create(createdById: string, note: string | undefined, days: number): Promise<Invite> {
    return this.invites.save(
      this.invites.create({
        // 16 random bytes: unguessable, and still short enough to paste
        code: randomBytes(16).toString('base64url'),
        createdById,
        note: note?.trim().slice(0, 100) || null,
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      }),
    );
  }

  list(): Promise<Invite[]> {
    return this.invites.find({ order: { createdAt: 'DESC' } });
  }

  async remove(id: string): Promise<void> {
    await this.invites.delete(id);
  }

  /** The invite if it exists, is unused and has not expired. */
  async findValid(code: string | undefined): Promise<Invite | null> {
    if (!code) return null;
    const invite = await this.invites.findOne({ where: { code: code.trim() } });
    if (!invite || invite.usedById || invite.expiresAt.getTime() < Date.now()) return null;
    return invite;
  }

  async markUsed(invite: Invite, userId: string): Promise<void> {
    await this.invites.update(invite.id, { usedById: userId, usedAt: new Date() });
  }
}
