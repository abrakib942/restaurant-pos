import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateBillDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ example: '0.00' })
  @IsString()
  discount!: string;

  @ApiProperty({ example: '8.875' })
  @IsString()
  taxRatePercent!: string;

  @ApiProperty({ example: '0.00' })
  @IsString()
  tip!: string;
}

export class PayBillDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ enum: ['CASH', 'CARD', 'OTHER'] })
  @IsEnum(['CASH', 'CARD', 'OTHER'])
  paymentMethod!: 'CASH' | 'CARD' | 'OTHER';
}
