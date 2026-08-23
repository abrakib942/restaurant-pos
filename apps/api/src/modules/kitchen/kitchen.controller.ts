import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { KitchenService } from './kitchen.service';

@ApiTags('Kitchen')
@Controller('kitchen')
@Roles('KITCHEN')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('board')
  @ApiOperation({ summary: 'Kitchen ticket board' })
  getBoard() {
    return this.kitchenService.getKitchenBoard();
  }

  @Post('items/:id/start')
  @ApiOperation({ summary: 'Start kitchen ticket' })
  start(@Param('id') id: string) {
    return this.kitchenService.startKitchenItem(id);
  }

  @Post('items/:id/ready')
  @ApiOperation({ summary: 'Mark kitchen ticket ready' })
  ready(@Param('id') id: string) {
    return this.kitchenService.markKitchenItemReady(id);
  }
}
