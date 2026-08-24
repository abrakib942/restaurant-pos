import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OrderLineDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  rush?: boolean;
}

export class UpdatePendingLineDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  orderItemId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  qty!: number;
}

export class SubmitOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @ApiProperty({ type: [OrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items!: OrderLineDto[];

  /** Void these PENDING lines on the live fire (pending patch only). */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  removeItemIds?: string[];

  /** Change qty on PENDING lines on the live fire (pending patch only). */
  @ApiPropertyOptional({ type: [UpdatePendingLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePendingLineDto)
  updateItems?: UpdatePendingLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceRequestId?: string;
}
