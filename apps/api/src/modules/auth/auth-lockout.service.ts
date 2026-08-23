import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  LOGIN_IP_MAX_FAILURES,
  LOGIN_LOCKOUT_MS,
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
} from '@/common/constants/auth.constants';

export type LoginLockStatus =
  | { locked: false }
  | { locked: true; message: string; retryAfterMs: number };

@Injectable()
export class AuthLockoutService {
  constructor(private readonly db: DbService) {}

  async checkLoginLockout(username: string, ip: string): Promise<LoginLockStatus> {
    const since = new Date(Date.now() - LOGIN_WINDOW_MS);

    const [userFailures, ipFailures] = await Promise.all([
      this.db.client.loginAttempt.findMany({
        where: {
          username,
          success: false,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: LOGIN_MAX_FAILURES,
        select: { createdAt: true },
      }),
      ip
        ? this.db.client.loginAttempt.count({
            where: {
              ip,
              success: false,
              createdAt: { gte: since },
            },
          })
        : Promise.resolve(0),
    ]);

    if (ipFailures >= LOGIN_IP_MAX_FAILURES) {
      return this.lockMessage();
    }

    if (userFailures.length < LOGIN_MAX_FAILURES) {
      return { locked: false };
    }

    const lockEndsAt = userFailures[0]!.createdAt.getTime() + LOGIN_LOCKOUT_MS;
    if (Date.now() < lockEndsAt) {
      return {
        locked: true,
        message: this.formatLockMessage(lockEndsAt - Date.now()),
        retryAfterMs: lockEndsAt - Date.now(),
      };
    }

    return { locked: false };
  }

  async recordLoginAttempt(input: { username: string; ip: string; success: boolean }) {
    await this.db.client.loginAttempt.create({
      data: {
        username: input.username,
        ip: input.ip,
        success: input.success,
      },
    });
  }

  private lockMessage(): LoginLockStatus {
    const retryAfterMs = LOGIN_LOCKOUT_MS;
    return {
      locked: true,
      message: this.formatLockMessage(retryAfterMs),
      retryAfterMs,
    };
  }

  private formatLockMessage(retryAfterMs: number): string {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
    return `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
}
