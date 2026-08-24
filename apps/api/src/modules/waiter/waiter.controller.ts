import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '@/common/decorators/current-user.decorator';
import { CheckoutQueryDto } from './dto/waiter.dto';
import { WaiterService } from './waiter.service';

@ApiTags('Waiter')
@Controller('waiter')
@Roles('WAITER')
export class WaiterController {
  constructor(private readonly waiterService: WaiterService) {}

  @Get('floor')
  @ApiOperation({ summary: 'Waiter floor grid with tables and waitlist strip' })
  getFloor() {
    return this.waiterService.getFloor();
  }

  @Get('tables/:id/pos')
  @ApiOperation({ summary: 'POS bundle for a table' })
  getPos(@Param('id') id: string) {
    return this.waiterService.getTablePos(id);
  }

  @Get('tables/:id/checkout')
  @ApiOperation({ summary: 'Checkout bundle for a table' })
  getCheckout(@Param('id') id: string, @Query() query: CheckoutQueryDto) {
    return this.waiterService.getTableCheckout(id, query.orderId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Ready pass notifications for waiter' })
  getNotifications(@CurrentUser() user: AuthUser) {
    return this.waiterService.getNotifications(user.userId);
  }

  @Get('kitchen-queue')
  @ApiOperation({ summary: 'Kitchen queue position and ETA for this waiter\'s tickets' })
  getKitchenQueue(@CurrentUser() user: AuthUser) {
    return this.waiterService.getKitchenQueue(user.userId);
  }
}
