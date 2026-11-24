import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Like, Not, Repository } from 'typeorm';
import { Email } from '../../database/entities/email.entity';

@Injectable()
export class EmailService {
  constructor(
    @InjectRepository(Email)
    private emailsRepository: Repository<Email>,
  ) {}

  /**
   * A page of emails, newest first. `folder` may also be "starred" or
   * "important", which look across folders (except trash).
   */
  async findAll(params: {
    accountId?: string;
    /** Limit to these mailboxes (an empty list matches nothing) */
    accountIds?: string[];
    folder?: string;
    page?: number;
    limit?: number;
    search?: string;
    unreadOnly?: boolean;
  }): Promise<Email[]> {
    const { accountId, accountIds, folder, page = 1, limit = 50, search, unreadOnly } = params;
    if (accountIds && accountIds.length === 0) return [];

    const base: FindOptionsWhere<Email> = {};
    if (accountId) base.accountId = accountId;
    else if (accountIds) base.accountId = In(accountIds);
    if (folder === 'starred') {
      base.isStarred = true;
      base.folder = Not('trash');
    } else if (folder === 'important') {
      base.isImportant = true;
      base.folder = Not('trash');
    } else if (folder) {
      base.folder = folder;
    }
    if (unreadOnly) base.isRead = false;
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
      order: { date: 'DESC', id: 'DESC' },
    });
  }

  /** Unread/total numbers for the sidebar, across the given mailboxes. */
  async counts(accountIds: string[]) {
    const empty = { inbox: 0, starred: 0, important: 0, drafts: 0, spam: 0, byMailbox: {} as Record<string, number> };
    if (accountIds.length === 0) return empty;
    const rows: { accountId: string; folder: string; unread: number; starred: number; important: number; total: number }[] =
      await this.emailsRepository
        .createQueryBuilder('e')
        .select('e.accountId', 'accountId')
        .addSelect('e.folder', 'folder')
        .addSelect('SUM(CASE WHEN e.isRead = 0 THEN 1 ELSE 0 END)', 'unread')
        .addSelect('SUM(CASE WHEN e.isStarred = 1 THEN 1 ELSE 0 END)', 'starred')
        .addSelect('SUM(CASE WHEN e.isImportant = 1 AND e.isRead = 0 THEN 1 ELSE 0 END)', 'important')
        .addSelect('COUNT(*)', 'total')
        .where('e.accountId IN (:...ids)', { ids: accountIds })
        .groupBy('e.accountId')
        .addGroupBy('e.folder')
        .getRawMany();
    const counts = empty;
    for (const r of rows) {
      const unread = Number(r.unread) || 0;
      if (r.folder === 'inbox') {
        counts.inbox += unread;
        counts.byMailbox[r.accountId] = (counts.byMailbox[r.accountId] || 0) + unread;
      }
      if (r.folder === 'spam') counts.spam += unread;
      if (r.folder === 'drafts') counts.drafts += Number(r.total) || 0;
      if (r.folder !== 'trash') {
        counts.starred += Number(r.starred) || 0;
        counts.important += Number(r.important) || 0;
      }
    }
    return counts;
  }

  async findByImapLocation(accountId: string, imapFolder: string, imapUid: number): Promise<Email | null> {
    return this.emailsRepository.findOne({ where: { accountId, imapFolder, imapUid } });
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

  async removeByAccount(accountId: string): Promise<void> {
    await this.emailsRepository.delete({ accountId });
  }
}
