import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '@/common/decorators/current-user.decorator';
import {
  CreateWaitlistEntryDto,
  SeatWaitlistEntryDto,
  WaitlistActiveQueryDto,
} from './dto/waitlist.dto';
import { WaitlistService } from './waitlist.service';

@ApiTags('Admin')
@Controller('admin/waitlist')
@Roles('ADMIN')
export class WaitlistAdminController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get()
  @ApiOperation({ summary: 'Waitlist for admin (active + history)' })
  list() {
    return this.waitlistService.getWaitlistForAdmin();
  }

  @Get('available-tables')
  @ApiOperation({ summary: 'Available tables for seating' })
  availableTables() {
    return this.waitlistService.getAvailableTablesForSeating();
  }

  @Post()
  @ApiOperation({ summary: 'Add party to waitlist' })
  create(@Body() body: CreateWaitlistEntryDto) {
    return this.waitlistService.createEntry(body);
  }

  @Post(':id/notify')
  @ApiOperation({ summary: 'Notify waiting party' })
  notify(@Param('id') id: string) {
    return this.waitlistService.notifyEntry(id);
  }

  @Post(':id/seat')
  @ApiOperation({ summary: 'Seat party at table' })
  seat(
    @Param('id') id: string,
    @Body() body: SeatWaitlistEntryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.waitlistService.seatEntry(id, body, {
      userId: user.userId,
      name: user.name,
    });
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel waitlist entry' })
  cancel(@Param('id') id: string) {
    return this.waitlistService.cancelEntry(id);
  }

  @Post(':id/no-show')
  @ApiOperation({ summary: 'Mark party as no-show' })
  noShow(@Param('id') id: string) {
    return this.waitlistService.markNoShow(id);
  }
}

@ApiTags('Waiter')
@Controller('waiter/waitlist')
@Roles('WAITER')
export class WaitlistWaiterController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Get('active')
  @ApiOperation({ summary: 'Active waitlist strip for waiter floor' })
  active(@Query() query: WaitlistActiveQueryDto) {
    return this.waitlistService.getActiveWaitlist(query.limit);
  }
}
