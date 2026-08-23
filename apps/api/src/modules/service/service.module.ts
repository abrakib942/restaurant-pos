import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';

@Module({
  imports: [AuditModule],
  controllers: [ServiceController],
  providers: [ServiceService],
})
export class ServiceModule {}
