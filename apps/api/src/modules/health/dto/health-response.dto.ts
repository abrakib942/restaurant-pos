import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'Health status' })
  status: string;

  @ApiProperty({
    example: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
    },
    description: 'Health check details',
  })
  info: Record<string, any>;

  @ApiProperty({ example: {}, description: 'Error details if any' })
  error: Record<string, any>;

  @ApiProperty({
    example: {
      database: { status: 'up' },
      memory_heap: { status: 'up' },
      memory_rss: { status: 'up' },
      storage: { status: 'up' },
    },
    description: 'Health check details',
  })
  details: Record<string, any>;
}

export class PingResponseDto {
  @ApiProperty({ example: 'ok', description: 'Status' })
  status: string;

  @ApiProperty({ example: 'pong', description: 'Response message' })
  message: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Timestamp' })
  timestamp: string;
}
