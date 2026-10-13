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
import { Email } from '../../database/entities/email.entity';
import { CurrentAccount, JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('emails')
@UseGuards(JwtAuthGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get()
  async findAll(
    @CurrentAccount() accountId: string,
    @Query() query: { folder?: string; page?: string; limit?: string; search?: string },
  ): Promise<Email[]> {
    return this.emailService.findAll({
      accountId,
      folder: query.folder,
      search: query.search,
      page: Math.max(1, Number(query.page) || 1),
      limit: Math.min(500, Math.max(1, Number(query.limit) || 50)),
    });
  }

  @Get(':id')
  async findOne(@CurrentAccount() accountId: string, @Param('id') id: string): Promise<Email> {
    return this.owned(accountId, id);
  }

  @Patch(':id')
  async update(
    @CurrentAccount() accountId: string,
    @Param('id') id: string,
    @Body() body: Pick<Partial<Email>, 'isRead' | 'isStarred' | 'isImportant' | 'folder' | 'labels'>,
  ): Promise<Email | null> {
    await this.owned(accountId, id);
    const { isRead, isStarred, isImportant, folder, labels } = body;
    const changes = Object.fromEntries(
      Object.entries({ isRead, isStarred, isImportant, folder, labels }).filter(
        ([, v]) => v !== undefined,
      ),
    );
    return this.emailService.update(id, changes);
  }

  @Delete(':id')
  async remove(@CurrentAccount() accountId: string, @Param('id') id: string): Promise<void> {
    await this.owned(accountId, id);
    return this.emailService.remove(id);
  }

  private async owned(accountId: string, id: string): Promise<Email> {
    const email = await this.emailService.findOne(id);
    if (!email || email.accountId !== accountId) throw new NotFoundException();
    return email;
  }
}
