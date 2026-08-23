import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MenuQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class CreateMenuItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: '12.50' })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, { message: 'Price must be a valid amount' })
  price!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  imageUrl!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateMenuItemDto extends CreateMenuItemDto {}
