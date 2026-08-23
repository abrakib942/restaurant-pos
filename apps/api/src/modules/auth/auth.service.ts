import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginDto): Promise<ServiceResult<LoginResponseDto>> {
    const user = await this.db.client.user.findUnique({
      where: { username: input.username.trim().toLowerCase() },
    });

    if (!user) {
      return createErrorResult(
        { name: 'unauthorized', message: 'Invalid username or PIN' },
        'Invalid username or PIN',
      ) as ServiceResult<LoginResponseDto>;
    }

    const valid = await bcrypt.compare(input.pin, user.pinHash);
    if (!valid) {
      return createErrorResult(
        { name: 'unauthorized', message: 'Invalid username or PIN' },
        'Invalid username or PIN',
      ) as ServiceResult<LoginResponseDto>;
    }

    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '12h',
      },
    );

    return createSuccessResult(
      {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
      },
      'Login successful',
    );
  }

  async validateUser(userId: string) {
    const user = await this.db.client.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    };
  }
}
