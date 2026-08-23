import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffQueryDto {
  @ApiPropertyOptional({ enum: ['WAITER', 'KITCHEN'] })
  @IsOptional()
  @IsEnum(['WAITER', 'KITCHEN'])
  role?: 'WAITER' | 'KITCHEN';
}

export class CreateStaffDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9._-]+$/, {
    message: 'Username must be lowercase letters, numbers, ., _, or -',
  })
  @MaxLength(32)
  username!: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be 4 digits' })
  pin!: string;

  @ApiProperty({ enum: ['WAITER', 'KITCHEN'] })
  @IsEnum(['WAITER', 'KITCHEN'])
  role!: 'WAITER' | 'KITCHEN';
}

export class UpdateStaffDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[a-z0-9._-]+$/, {
    message: 'Username must be lowercase letters, numbers, ., _, or -',
  })
  @MaxLength(32)
  username!: string;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'PIN must be 4 digits' })
  pin?: string;

  @ApiProperty({ enum: ['WAITER', 'KITCHEN'] })
  @IsEnum(['WAITER', 'KITCHEN'])
  role!: 'WAITER' | 'KITCHEN';
}
