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
import { Folder } from '../../database/entities/folder.entity';
import { CurrentAccount, JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Get()
  async findAll(@CurrentAccount() accountId: string): Promise<Folder[]> {
    return this.folderService.findAll({ accountId });
  }

  @Get(':id')
  async findOne(@CurrentAccount() accountId: string, @Param('id') id: string): Promise<Folder> {
    return this.owned(accountId, id);
  }

  @Post()
  async create(
    @CurrentAccount() accountId: string,
    @Body() body: Pick<Partial<Folder>, 'name' | 'color' | 'parentId'>,
  ): Promise<Folder> {
    return this.folderService.create({
      accountId,
      name: body.name,
      color: body.color,
      parentId: body.parentId,
      type: 'custom',
    });
  }

  @Put(':id')
  async update(
    @CurrentAccount() accountId: string,
    @Param('id') id: string,
    @Body() body: Pick<Partial<Folder>, 'name' | 'color'>,
  ): Promise<Folder | null> {
    await this.owned(accountId, id);
    return this.folderService.update(id, { name: body.name, color: body.color });
  }

  @Delete(':id')
  async remove(@CurrentAccount() accountId: string, @Param('id') id: string): Promise<void> {
    await this.owned(accountId, id);
    return this.folderService.remove(id);
  }

  private async owned(accountId: string, id: string): Promise<Folder> {
    const folder = await this.folderService.findOne(id);
    if (!folder || folder.accountId !== accountId) throw new NotFoundException();
    return folder;
  }
}
