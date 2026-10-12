import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../database/entities/account.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
  ) {}

  async findAll(): Promise<Account[]> {
    return this.accountsRepository.find();
  }

  async findOne(id: string): Promise<Account | null> {
    return this.accountsRepository.findOne({ where: { id } });
  }

  async create(createAccountDto: Partial<Account>): Promise<Account> {
    const account = this.accountsRepository.create(createAccountDto);
    
    // Encrypt password if provided
    if (createAccountDto.encryptedPassword) {
      const salt = await bcrypt.genSalt();
      account.encryptedPassword = await bcrypt.hash(createAccountDto.encryptedPassword, salt);
    }
    
    return this.accountsRepository.save(account);
  }

  async update(id: string, updateAccountDto: Partial<Account>): Promise<Account | null> {
    await this.accountsRepository.update(id, updateAccountDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.accountsRepository.delete(id);
  }

  async findByEmail(email: string): Promise<Account | null> {
    return this.accountsRepository.findOne({ where: { email } });
  }

  async updateConnectionStatus(id: string, connected: boolean): Promise<void> {
    await this.accountsRepository.update(id, { connected });
  }
}
