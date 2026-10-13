import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, Like } from 'typeorm';
import { Email } from '../../database/entities/email.entity';

@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(Email)
    private emailsRepository: Repository<Email>,
  ) {}

  async findAll(params: {
    accountId?: string;
    folder?: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<Email[]> {
    const { accountId, folder, page = 1, limit = 50, search } = params;
    
    const base: FindOptionsWhere<Email> = {};
    if (accountId) base.accountId = accountId;
    if (folder) base.folder = folder;
    // An array of conditions is OR-ed together by TypeORM
    const where = search
      ? (['subject', 'from', 'fromName', 'body'] as const).map((field) => ({
          ...base,
          [field]: Like(`%${search}%`),
        }))
      : base;

    return this.emailsRepository.find({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Email | null> {
    return this.emailsRepository.findOne({ where: { id } });
  }

  async create(createEmailDto: Partial<Email>): Promise<Email> {
    const email = this.emailsRepository.create(createEmailDto);
    return this.emailsRepository.save(email);
  }

  async update(id: string, updateEmailDto: Partial<Email>): Promise<Email | null> {
    await this.emailsRepository.update(id, updateEmailDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.emailsRepository.delete(id);
  }

  async markAsRead(id: string, isRead: boolean): Promise<void> {
    await this.emailsRepository.update(id, { isRead });
  }

  async toggleStar(id: string): Promise<void> {
    const email = await this.findOne(id);
    if (email) {
      await this.emailsRepository.update(id, { isStarred: !email.isStarred });
    }
  }

  async findByMessageId(accountId: string, messageId: string): Promise<Email | null> {
    return this.emailsRepository.findOne({ where: { accountId, messageId } });
  }

  async search(query: string, accountId?: string): Promise<Email[]> {
    return this.findAll({ search: query, accountId });
  }
}
