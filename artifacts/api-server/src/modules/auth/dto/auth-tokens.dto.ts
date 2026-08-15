import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({ description: 'Short-lived JWT access token (15 min)' })
  accessToken: string;

  @ApiProperty({ description: 'Opaque refresh token (7 days, rotated on use)' })
  refreshToken: string;

  @ApiProperty({ description: 'Access token TTL in seconds', example: 900 })
  expiresIn: number;

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';
}

export class LoginResponseDto {
  @ApiProperty()
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    status: string;
  };

  @ApiProperty()
  tokens: AuthTokensDto;
}
