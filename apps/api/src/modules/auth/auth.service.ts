import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { DbService } from '@/db/db.service';
import { roleHomePath } from '@/common/constants/auth.constants';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { AuditAction, AuditService } from '@/modules/audit/audit.service';
import { AuthLockoutService } from './auth-lockout.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly lockout: AuthLockoutService,
    private readonly audit: AuditService,
  ) {}

  async login(
    input: LoginDto,
    ip: string,
  ): Promise<ServiceResult<LoginResponseDto & { accessToken: string }>> {
    const username = input.username.trim().toLowerCase();

    const lock = await this.lockout.checkLoginLockout(username, ip);
    if (lock.locked) {
      await this.audit.writeAuditLog({
        action: AuditAction.LoginLocked,
        actorName: username,
        meta: { ip },
      });
      return createErrorResult(
        { name: 'badRequest', message: lock.message },
        lock.message,
      ) as ServiceResult<LoginResponseDto & { accessToken: string }>;
    }

    const user = await this.db.client.user.findUnique({
      where: { username },
    });

    if (!user) {
      await this.lockout.recordLoginAttempt({ username, ip, success: false });
      await this.audit.writeAuditLog({
        action: AuditAction.LoginFailed,
        actorName: username,
        meta: { ip, reason: 'unknown_user' },
      });
      return createErrorResult(
        { name: 'unauthorized', message: 'Invalid username or PIN' },
        'Invalid username or PIN',
      ) as ServiceResult<LoginResponseDto & { accessToken: string }>;
    }

    const valid = await bcrypt.compare(input.pin, user.pinHash);
    if (!valid) {
      await this.lockout.recordLoginAttempt({ username, ip, success: false });
      await this.audit.writeAuditLog({
        action: AuditAction.LoginFailed,
        actorId: user.id,
        actorName: user.name,
        meta: { ip, reason: 'bad_pin' },
      });
      return createErrorResult(
        { name: 'unauthorized', message: 'Invalid username or PIN' },
        'Invalid username or PIN',
      ) as ServiceResult<LoginResponseDto & { accessToken: string }>;
    }

    await this.lockout.recordLoginAttempt({ username, ip, success: true });
    await this.audit.writeAuditLog({
      action: AuditAction.LoginSuccess,
      actorId: user.id,
      actorName: user.name,
      meta: { ip, role: user.role },
    });

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

    const sessionUser = {
      userId: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    };

    return createSuccessResult(
      {
        accessToken,
        redirectTo: roleHomePath(user.role),
        user: sessionUser,
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
