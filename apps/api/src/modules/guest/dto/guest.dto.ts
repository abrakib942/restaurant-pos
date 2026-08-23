import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GuestOrderLineDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  qty!: number;
}

export class SubmitGuestOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  qrSlug!: string;

  @ApiProperty({ type: [GuestOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuestOrderLineDto)
  items!: GuestOrderLineDto[];
}

export class CreateGuestServiceRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  qrSlug!: string;

  @ApiProperty({ enum: ['CALL_WAITER', 'REQUEST_BILL'] })
  @IsEnum(['CALL_WAITER', 'REQUEST_BILL'])
  type!: 'CALL_WAITER' | 'REQUEST_BILL';
}
