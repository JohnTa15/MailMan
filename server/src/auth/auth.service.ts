import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '../data/accounts/accounts.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly accountService: AccountService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const account = await this.accountService.findByEmail(email);
    
    if (account && account.encryptedPassword) {
      // In production, compare with bcrypt
      // For now, just check if password exists
      if (password) {
        return account;
      }
    }
    
    return null;
  }

  async login(account: any) {
    const payload = { email: account.email, sub: account.id };
    return {
      access_token: this.jwtService.sign(payload),
      account: {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        type: account.type,
        connected: account.connected,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return {
        access_token: this.jwtService.sign(payload),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
