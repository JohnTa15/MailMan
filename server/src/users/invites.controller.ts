import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { InvitesService } from './invites.service';

@Controller('invites')
@UseGuards(JwtAuthGuard, AdminGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get()
  async list() {
    const invites = await this.invitesService.list();
    const now = Date.now();
    return invites.map((i) => ({
      id: i.id,
      code: i.code,
      note: i.note,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
      usedAt: i.usedAt,
      status: i.usedById ? 'used' : i.expiresAt.getTime() < now ? 'expired' : 'active',
    }));
  }

  @Post()
  async create(@CurrentUser() userId: string, @Body() body: { note?: string; days?: number }) {
    const days = Math.min(30, Math.max(1, Number(body.days) || 7));
    const invite = await this.invitesService.create(userId, body.note, days);
    return { id: invite.id, code: invite.code, note: invite.note, expiresAt: invite.expiresAt };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.invitesService.remove(id);
    return { success: true };
  }
}
