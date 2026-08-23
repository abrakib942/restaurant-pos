import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@/common/decorators/public.decorator';
import { DbService } from '@/db/db.service';
import { HealthResponseDto, PingResponseDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly db: DbService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({ status: 200, type: HealthResponseDto })
  check() {
    return this.health.check([
      async () => {
        try {
          await this.db.client.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch (error) {
          return {
            database: {
              status: 'down',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      },
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
    ]);
  }

  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Simple ping endpoint' })
  @ApiResponse({ status: 200, type: PingResponseDto })
  ping(): PingResponseDto {
    return {
      status: 'ok',
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }
}
