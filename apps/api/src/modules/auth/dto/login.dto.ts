import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: '1111' })
  @IsString()
  @Length(4, 4)
  pin!: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  user!: {
    id: string;
    name: string;
    username: string;
    role: string;
  };
}

export class JwtPayload {
  sub!: string;
  username!: string;
  role!: string;
  name!: string;
}
