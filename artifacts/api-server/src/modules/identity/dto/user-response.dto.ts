import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { User } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() email: string;
  @ApiProperty() phone: string;
  @ApiProperty() role: string;
  @ApiProperty() status: string;
  @ApiProperty() registrationSource: string;
  @ApiPropertyOptional({ type: String, nullable: true }) lastLoginAt: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;

  static from(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.email = user.email;
    dto.phone = user.phone;
    dto.role = user.role;
    dto.status = user.status;
    dto.registrationSource = user.registrationSource;
    dto.lastLoginAt = user.lastLoginAt?.toISOString() ?? null;
    dto.createdAt = user.createdAt.toISOString();
    dto.updatedAt = user.updatedAt.toISOString();
    return dto;
  }
}
