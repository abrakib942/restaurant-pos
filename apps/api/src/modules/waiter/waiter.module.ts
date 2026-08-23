import { Module } from '@nestjs/common';
import { WaiterController } from './waiter.controller';
import { WaiterService } from './waiter.service';

@Module({
  controllers: [WaiterController],
  providers: [WaiterService],
})
export class WaiterModule {}
