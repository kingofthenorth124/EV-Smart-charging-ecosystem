import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";

export enum AdminUserRole {
  ADMIN_OFFICER = "ADMIN_OFFICER",
  SUPPORT = "SUPPORT",
}

export class CreateAdminUserDto {
  @ApiProperty({ example: "John" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  @ApiProperty({ example: "john.admin@example.com" })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: "+2348012345678" })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  @Matches(/^\+?[0-9\s\-()]{10,20}$/)
  phone: string;

  @ApiProperty({ minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({
    enum: AdminUserRole,
    example: AdminUserRole.ADMIN_OFFICER,
  })
  @IsEnum(AdminUserRole)
  role: AdminUserRole;
}
