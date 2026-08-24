import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

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

/** @deprecated Guests can no longer send orders to the kitchen. */
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

export class GuestServiceRequestLineDto {
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
  @IsString()
  @MaxLength(120)
  note?: string;
}

export class CreateGuestServiceRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  qrSlug!: string;

  @ApiProperty({ enum: ["CALL_WAITER", "REQUEST_BILL"] })
  @IsEnum(["CALL_WAITER", "REQUEST_BILL"])
  type!: "CALL_WAITER" | "REQUEST_BILL";

  @ApiPropertyOptional({ type: [GuestServiceRequestLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestServiceRequestLineDto)
  items?: GuestServiceRequestLineDto[];
}
