import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export enum UserRoleFilter {
  CUSTOMER = 'CUSTOMER',
  ADMIN_OFFICER = 'ADMIN_OFFICER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATIONS = 'OPERATIONS',
  SUPPORT = 'SUPPORT',
  FINANCE = 'FINANCE',
  TECHNICAL = 'TECHNICAL',
  DEVELOPER = 'DEVELOPER',
}

export enum UserStatusFilter {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserStatusFilter })
  @IsOptional()
  @IsEnum(UserStatusFilter)
  status?: UserStatusFilter;

  @ApiPropertyOptional({ enum: UserRoleFilter })
  @IsOptional()
  @IsEnum(UserRoleFilter)
  role?: UserRoleFilter;

  @ApiPropertyOptional({ description: 'Search by name or email (partial match)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
