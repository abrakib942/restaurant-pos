import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { createSuccessResult } from '@/common/interfaces/service-result.interface';
import { AuditQueryDto } from './dto/audit-query.dto';
import { AuditService } from './audit.service';

@ApiTags('Admin')
@Controller('admin/audit')
@Roles('ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Recent audit log entries' })
  async getAuditLog(@Query() query: AuditQueryDto) {
    const rows = await this.auditService.getAdminAuditLog(query.limit ?? 100);
    return createSuccessResult(rows);
  }
}
