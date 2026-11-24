import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { FolderService } from './folders.service';
import { AccountService } from '../accounts/accounts.service';
import { Folder } from '../../database/entities/folder.entity';
import { CurrentUser, JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FolderController {
  constructor(
    private readonly folderService: FolderService,
    private readonly accountService: AccountService,
  ) {}

  @Get()
  async findAll(@CurrentUser() userId: string): Promise<Folder[]> {
    const mailboxes = await this.accountService.findByUser(userId);
    const folders = await Promise.all(mailboxes.map((m) => this.folderService.findAll({ accountId: m.id })));
    return folders.flat();
  }

  @Get(':id')
  async findOne(@CurrentUser() userId: string, @Param('id') id: string): Promise<Folder> {
    return this.owned(userId, id);
  }

  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() body: Pick<Partial<Folder>, 'accountId' | 'name' | 'color' | 'parentId'>,
  ): Promise<Folder> {
    const mailbox = body.accountId ? await this.accountService.findOne(body.accountId) : null;
    if (!mailbox || mailbox.userId !== userId) throw new NotFoundException('Mailbox not found');
    return this.folderService.create({
      accountId: mailbox.id,
      name: body.name,
      color: body.color,
      parentId: body.parentId,
      type: 'custom',
    });
  }

  @Put(':id')
  async update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: Pick<Partial<Folder>, 'name' | 'color'>,
  ): Promise<Folder | null> {
    await this.owned(userId, id);
    return this.folderService.update(id, { name: body.name, color: body.color });
  }

  @Delete(':id')
  async remove(@CurrentUser() userId: string, @Param('id') id: string): Promise<void> {
    await this.owned(userId, id);
    return this.folderService.remove(id);
  }

  private async owned(userId: string, id: string): Promise<Folder> {
    const folder = await this.folderService.findOne(id);
    const mailbox = folder ? await this.accountService.findOne(folder.accountId) : null;
    if (!folder || mailbox?.userId !== userId) throw new NotFoundException();
    return folder;
  }
}
