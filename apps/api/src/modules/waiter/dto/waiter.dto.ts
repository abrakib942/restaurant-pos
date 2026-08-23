import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orderId?: string;
}
