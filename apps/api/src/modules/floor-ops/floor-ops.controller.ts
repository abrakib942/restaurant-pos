import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import {
  MergeTableOrdersDto,
  ReassignOrderWaiterDto,
  SplitOrderItemsDto,
  TransferTableOrderDto,
} from './dto/floor-ops.dto';
import { FloorOpsService } from './floor-ops.service';

@ApiTags('Waiter')
@Controller('waiter/floor')
@Roles('WAITER')
export class FloorOpsController {
  constructor(private readonly floorOpsService: FloorOpsService) {}

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer order to another table' })
  transfer(@Body() body: TransferTableOrderDto) {
    return this.floorOpsService.transferTableOrder(body);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge table orders' })
  merge(@Body() body: MergeTableOrdersDto) {
    return this.floorOpsService.mergeTableOrders(body);
  }

  @Post('reassign')
  @ApiOperation({ summary: 'Reassign order to another waiter' })
  reassign(@Body() body: ReassignOrderWaiterDto) {
    return this.floorOpsService.reassignOrderWaiter(body);
  }

  @Post('split')
  @ApiOperation({ summary: 'Split items to a new check' })
  split(@Body() body: SplitOrderItemsDto) {
    return this.floorOpsService.splitOrderItems(body);
  }
}
