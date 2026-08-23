import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { validate } from './config/env';
import { DbModule } from './db/db.module';
import { LoggerMiddleware } from '@/common/middlewares/logger.middleware';
import { TransformInterceptor } from '@/common/interceptors/transform.interceptor';
import { JwtGuard } from '@/common/guards/jwt.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { HealthModule } from '@/modules/health/health.module';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    DbModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    TransformInterceptor,
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
