import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '@/common/decorators/public.decorator';
import {
  AUTH_COOKIE,
  AUTH_COOKIE_MAX_AGE_MS,
} from '@/common/constants/auth.constants';
import { CurrentUser, type AuthUser } from '@/common/decorators/current-user.decorator';
import { getClientIp } from '@/common/utils/client-ip';
import { AuthService } from './auth.service';
import { AuthUserDto, LoginDto, LoginResponseDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Staff login with username and PIN' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = getClientIp(req.headers);
    const result = await this.authService.login(body, ip);

    if (result.success && result.data?.accessToken) {
      const isProd = this.config.get<string>('NODE_ENV') === 'production';
      res.cookie(AUTH_COOKIE, result.data.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: AUTH_COOKIE_MAX_AGE_MS,
      });

      const { accessToken: _token, ...payload } = result.data;
      return {
        ...result,
        data: payload,
      };
    }

    return result;
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Clear staff session cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, { path: '/' });
    return { success: true, message: 'Logged out' };
  }

  @Get('me')
  @ApiOperation({ summary: 'Current authenticated staff user' })
  @ApiResponse({ status: 200, type: AuthUserDto })
  me(@CurrentUser() user: AuthUser) {
    return {
      success: true,
      data: user,
      message: 'Authenticated',
    };
  }
}
