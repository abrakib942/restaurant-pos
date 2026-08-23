import { ArrayMinSize, IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferTableOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fromTableId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toTableId!: string;
}

export class MergeTableOrdersDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sourceTableId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  targetTableId!: string;
}

export class ReassignOrderWaiterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  waiterId!: string;
}

export class SplitOrderItemsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  itemIds!: string[];
}
