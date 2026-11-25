import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RateLimiter } from '../auth/rate-limit';
import { MailboxesService, PasswordMailboxDto, toPublicMailbox } from './mailboxes.service';

// Each attempt makes the server log in to someone's mail server; keep that bounded
const connectLimiter = new RateLimiter(20, 15 * 60 * 1000);

@Controller('mailboxes')
@UseGuards(JwtAuthGuard)
export class MailboxesController {
  constructor(private readonly mailboxes: MailboxesService) {}

  @Get()
  async list(@CurrentUser() userId: string) {
    return (await this.mailboxes.list(userId)).map(toPublicMailbox);
  }

  @Post()
  async connect(@CurrentUser() userId: string, @Body() body: PasswordMailboxDto) {
    connectLimiter.hit(userId);
    return toPublicMailbox(await this.mailboxes.connectWithPassword(userId, body));
  }

  /** Adds an Office 365 shared mailbox opened with this mailbox's Microsoft sign-in. */
  @Post(':id/shared')
  async addShared(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: { email?: string }) {
    connectLimiter.hit(userId);
    return toPublicMailbox(await this.mailboxes.addShared(userId, id, body.email));
  }

  @Patch(':id')
  async rename(@CurrentUser() userId: string, @Param('id') id: string, @Body() body: { displayName?: string }) {
    return toPublicMailbox(await this.mailboxes.rename(userId, id, body.displayName));
  }

  @Delete(':id')
  async remove(@CurrentUser() userId: string, @Param('id') id: string) {
    await this.mailboxes.remove(userId, id);
    return { success: true };
  }
}
