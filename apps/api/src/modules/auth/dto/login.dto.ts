import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: '1111' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  pin!: string;
}

export class AuthUserDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  role!: string;
}

export class LoginResponseDto {
  @ApiProperty()
  redirectTo!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class JwtPayload {
  sub!: string;
  username!: string;
  role!: string;
  name!: string;
}
