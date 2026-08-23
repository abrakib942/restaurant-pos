import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '@/common/decorators/current-user.decorator';
import { ReportsQueryDto, VoidOrderItemDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('Admin')
@Controller('admin/reports')
@Roles('ADMIN')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Sales and void reports for date range' })
  getReports(@Query() query: ReportsQueryDto) {
    return this.reportsService.getAdminReports(query);
  }

  @Get('voidable-items')
  @ApiOperation({ summary: 'Open order items eligible for void' })
  getVoidableItems() {
    return this.reportsService.getVoidableOpenItems();
  }

  @Post('void')
  @ApiOperation({ summary: 'Void an open order line item' })
  voidItem(@Body() body: VoidOrderItemDto, @CurrentUser() user: AuthUser) {
    return this.reportsService.voidOrderItem(body, {
      userId: user.userId,
      name: user.name,
    });
  }
}
