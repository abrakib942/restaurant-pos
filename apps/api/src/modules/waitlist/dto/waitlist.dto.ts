import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WaitlistActiveQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class CreateWaitlistEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  partyName!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  partySize!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(180)
  quotedMinutes?: number;
}

export class SeatWaitlistEntryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableId!: string;
}
