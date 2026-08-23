import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { WaitlistAdminController, WaitlistWaiterController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';

@Module({
  imports: [AuditModule],
  controllers: [WaitlistAdminController, WaitlistWaiterController],
  providers: [WaitlistService],
})
export class WaitlistModule {}
