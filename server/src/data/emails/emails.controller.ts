import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { EmailService } from './emails.service';
import { AccountService } from '../accounts/accounts.service';
import { Email } from '../../database/entities/email.entity';
import { CurrentUser, JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly accountService: AccountService,
  ) {}

  /** Emails across all of the user's mailboxes, or one of them with ?accountId= */
  @Get()
  async findAll(
    @CurrentUser() userId: string,
    @Query() query: { accountId?: string; folder?: string; page?: string; limit?: string; search?: string },
  ): Promise<Email[]> {
    const mine = (await this.accountService.findByUser(userId)).map((a) => a.id);
    const accountIds = query.accountId ? mine.filter((id) => id === query.accountId) : mine;
    return this.emailService.findAll({
      accountIds,
      folder: query.folder,
      search: query.search,
      page: Math.max(1, Number(query.page) || 1),
      limit: Math.min(500, Math.max(1, Number(query.limit) || 50)),
    });
  }

  @Get(':id')
  async findOne(@CurrentUser() userId: string, @Param('id') id: string): Promise<Email> {
    return this.owned(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: Pick<Partial<Email>, 'isRead' | 'isStarred' | 'isImportant' | 'folder' | 'labels'>,
  ): Promise<Email | null> {
    await this.owned(userId, id);
    const { isRead, isStarred, isImportant, folder, labels } = body;
    const changes = Object.fromEntries(
      Object.entries({ isRead, isStarred, isImportant, folder, labels }).filter(
        ([, v]) => v !== undefined,
      ),
    );
    return this.emailService.update(id, changes);
  }

  @Delete(':id')
  async remove(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    await this.owned(userId, id);
    return this.emailService.remove(id);
  }

  private async owned(userId: string, id: string): Promise<Email> {
    const email = await this.emailService.findOne(id);
    const mailbox = email ? await this.accountService.findOne(email.accountId) : null;
    if (!email || mailbox?.userId !== userId) throw new NotFoundException();
    return email;
  }
}
