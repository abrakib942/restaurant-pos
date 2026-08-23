import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportsQueryDto {
  @ApiPropertyOptional({ example: '2026-08-17' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-08-23' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class VoidOrderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderItemId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
