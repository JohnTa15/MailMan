import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Folder } from '../../database/entities/folder.entity';

@Injectable()
export class FolderService {
  constructor(
    @InjectRepository(Folder)
    private foldersRepository: Repository<Folder>,
  ) {}

  async findAll(params: { accountId?: string }): Promise<Folder[]> {
    const { accountId } = params;
    const where: any = {};
    if (accountId) where.accountId = accountId;
    
    return this.foldersRepository.find({ where });
  }

  async findOne(id: string): Promise<Folder | null> {
    return this.foldersRepository.findOne({ where: { id } });
  }

  async create(createFolderDto: Partial<Folder>): Promise<Folder> {
    const folder = this.foldersRepository.create(createFolderDto);
    return this.foldersRepository.save(folder);
  }

  async update(id: string, updateFolderDto: Partial<Folder>): Promise<Folder | null> {
    await this.foldersRepository.update(id, updateFolderDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.foldersRepository.delete(id);
  }

  async findByAccountId(accountId: string): Promise<Folder[]> {
    return this.foldersRepository.find({ where: { accountId } });
  }
}
