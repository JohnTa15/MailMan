import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService, LoginDto } from './auth.service';
import { OAuthConfiguredGuard } from './oauth.config';

const CLIENT_URL = () => process.env.CLIENT_URL || 'http://localhost:3000';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.connect(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('token') token: string) {
    return this.authService.refreshToken(token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { success: true };
  }

  @Get('google')
  @UseGuards(new OAuthConfiguredGuard('google'), AuthGuard('google'))
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(new OAuthConfiguredGuard('google'), AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    const result = req.user;
    res.redirect(`${CLIENT_URL()}/auth/callback?token=${result.access_token}`);
  }

  @Get('facebook')
  @UseGuards(new OAuthConfiguredGuard('facebook'), AuthGuard('facebook'))
  async facebookAuth() {}

  @Get('facebook/callback')
  @UseGuards(new OAuthConfiguredGuard('facebook'), AuthGuard('facebook'))
  async facebookAuthCallback(@Req() req: any, @Res() res: any) {
    const result = req.user;
    res.redirect(`${CLIENT_URL()}/auth/callback?token=${result.access_token}`);
  }
}
