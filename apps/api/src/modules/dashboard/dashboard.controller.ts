import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Admin')
@Controller('admin/dashboard')
@Roles('ADMIN')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Admin dashboard stats' })
  getDashboard() {
    return this.dashboardService.getAdminDashboard();
  }
}
