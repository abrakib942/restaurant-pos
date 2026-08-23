import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '@/common/decorators/current-user.decorator';
import { CreateStaffDto, StaffQueryDto, UpdateStaffDto } from './dto/staff.dto';
import { StaffService } from './staff.service';

@ApiTags('Admin')
@Controller('admin/staff')
@Roles('ADMIN')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'List staff accounts' })
  list(@Query() query: StaffQueryDto) {
    return this.staffService.listStaff(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create staff account' })
  create(@Body() body: CreateStaffDto) {
    return this.staffService.createStaff(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update staff account' })
  update(@Param('id') id: string, @Body() body: UpdateStaffDto) {
    return this.staffService.updateStaff(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete staff account' })
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.staffService.deleteStaff(id, user.userId);
  }
}
