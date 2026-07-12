import { Controller, Post, Get, Body, Res, UseGuards, Req } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body('email') email: string,
    @Body('password') passwordHash: string,
    @Body('name') name: string
  ) {
    return this.authService.signup(email, passwordHash, name);
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') passwordHash: string,
    @Res({ passthrough: true }) res: any
  ) {
    const result = await this.authService.login(email, passwordHash);
    
    // Set httpOnly secure JWT token cookie
    res.cookie('jwt_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result.user;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: any) {
    res.clearCookie('jwt_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return req.user;
  }
}
