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
