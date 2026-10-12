import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AccountService } from './accounts.service';
import { Account } from '../../database/entities/account.entity';

@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async findAll(): Promise<Account[]> {
    return this.accountService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Account | null> {
    return this.accountService.findOne(id);
  }

  @Post()
  async create(@Body() createAccountDto: Partial<Account>): Promise<Account> {
    return this.accountService.create(createAccountDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAccountDto: Partial<Account>,
  ): Promise<Account | null> {
    return this.accountService.update(id, updateAccountDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.accountService.remove(id);
  }
}
