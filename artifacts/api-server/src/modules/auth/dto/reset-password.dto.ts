import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class RequestPasswordResetDto {
  @ApiProperty({ example: "amara@example.com" })
  @IsNotEmpty()
  @IsEmail({}, { message: "Enter a valid email address" })
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;
}

export class ConfirmPasswordResetDto {
  @ApiProperty({ description: "Reset token received via email notification" })
  @IsNotEmpty({ message: "Reset token is required" })
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsNotEmpty({ message: "New password is required" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(128)
  newPassword: string;
}
