import { Module } from '@nestjs/common';
import { FloorOpsController } from './floor-ops.controller';
import { FloorOpsService } from './floor-ops.service';

@Module({
  controllers: [FloorOpsController],
  providers: [FloorOpsService],
})
export class FloorOpsModule {}
