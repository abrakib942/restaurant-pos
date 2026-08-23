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
import { AuditModule } from '@/modules/audit/audit.module';
import { DashboardModule } from '@/modules/dashboard/dashboard.module';
import { ReportsModule } from '@/modules/reports/reports.module';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { MenuModule } from '@/modules/menu/menu.module';
import { TablesModule } from '@/modules/tables/tables.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { WaitlistModule } from '@/modules/waitlist/waitlist.module';
import { KitchenModule } from '@/modules/kitchen/kitchen.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { ServiceModule } from '@/modules/service/service.module';
import { FloorOpsModule } from '@/modules/floor-ops/floor-ops.module';
import { ServiceRequestsModule } from '@/modules/service-requests/service-requests.module';
import { GuestModule } from '@/modules/guest/guest.module';
import { UploadModule } from '@/modules/upload/upload.module';
import { WaiterModule } from '@/modules/waiter/waiter.module';

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
    AuditModule,
    DashboardModule,
    ReportsModule,
    CategoriesModule,
    MenuModule,
    TablesModule,
    StaffModule,
    WaitlistModule,
    KitchenModule,
    OrdersModule,
    ServiceModule,
    FloorOpsModule,
    ServiceRequestsModule,
    GuestModule,
    UploadModule,
    WaiterModule,
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
