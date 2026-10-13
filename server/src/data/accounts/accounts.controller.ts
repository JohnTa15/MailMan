import { Controller, Get, Patch, Delete, Body, NotFoundException, UseGuards } from '@nestjs/common';
import { AccountService } from './accounts.service';
import { Account } from '../../database/entities/account.entity';
import { CurrentAccount, JwtAuthGuard } from '../../auth/jwt-auth.guard';

export type PublicAccount = Omit<Account, 'encryptedPassword' | 'accessToken' | 'refreshToken'>;

function toPublic(account: Account): PublicAccount {
  const { encryptedPassword, accessToken, refreshToken, ...rest } = account;
  return rest;
}

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('me')
  async me(@CurrentAccount() accountId: string): Promise<PublicAccount> {
    const account = await this.accountService.findOne(accountId);
    if (!account) throw new NotFoundException();
    return toPublic(account);
  }

  @Patch('me')
  async update(
    @CurrentAccount() accountId: string,
    @Body() body: { displayName?: string },
  ): Promise<PublicAccount> {
    const account = await this.accountService.update(accountId, {
      displayName: body.displayName,
    });
    if (!account) throw new NotFoundException();
    return toPublic(account);
  }

  @Delete('me')
  async remove(@CurrentAccount() accountId: string): Promise<void> {
    return this.accountService.remove(accountId);
  }
}
