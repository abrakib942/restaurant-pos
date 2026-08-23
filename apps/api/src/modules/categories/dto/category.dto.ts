import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name!: string;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999)
  sortOrder?: number;
}

export class UpdateCategoryDto extends CreateCategoryDto {}
