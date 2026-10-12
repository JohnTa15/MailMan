import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { FolderService } from './folders.service';
import { Folder } from '../../database/entities/folder.entity';

@Controller('folders')
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Get()
  async findAll(@Param('accountId') accountId?: string): Promise<Folder[]> {
    return this.folderService.findAll({ accountId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Folder | null> {
    return this.folderService.findOne(id);
  }

  @Post()
  async create(@Body() createFolderDto: Partial<Folder>): Promise<Folder> {
    return this.folderService.create(createFolderDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateFolderDto: Partial<Folder>,
  ): Promise<Folder | null> {
    return this.folderService.update(id, updateFolderDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.folderService.remove(id);
  }
}
