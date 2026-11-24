import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';

/** Managing AI keys happens only from a signed-in session, never with a key. */
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get('keys')
  list(@CurrentUser() userId: string) {
    return this.apiKeys.list(userId);
  }

  @Post('keys')
  create(@CurrentUser() userId: string, @Body() body: { name?: string; scopes?: string[] }) {
    return this.apiKeys.create(userId, body.name, body.scopes);
  }

  @Delete('keys/:id')
  async revoke(@CurrentUser() userId: string, @Param('id') id: string) {
    await this.apiKeys.revoke(userId, id);
    return { success: true };
  }

  @Get('activity')
  activity(@CurrentUser() userId: string, @Query('limit') limit?: string) {
    return this.apiKeys.recentActivity(userId, Number(limit) || 50);
  }
}
