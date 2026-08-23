import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Staff login with username and PIN' })
  @ApiResponse({ status: 200, type: LoginResponseDto })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }
}
