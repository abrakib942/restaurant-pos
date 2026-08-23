import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '@/common/decorators/current-user.decorator';
import { SubmitOrderDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Waiter')
@Controller('waiter/orders')
@Roles('WAITER')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Submit or add to waiter order' })
  submit(@Body() body: SubmitOrderDto, @CurrentUser() user: AuthUser) {
    return this.ordersService.submitOrder(body, user.userId);
  }
}
