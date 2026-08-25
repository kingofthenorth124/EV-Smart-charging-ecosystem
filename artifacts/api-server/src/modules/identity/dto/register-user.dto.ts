import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class RegisterUserDto {
  @ApiProperty({ example: "Amara" })
  @IsNotEmpty({ message: "First name is required" })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName: string;

  @ApiProperty({ example: "Okonkwo" })
  @IsNotEmpty({ message: "Last name is required" })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName: string;

  @ApiProperty({ example: "amara@example.com" })
  @IsNotEmpty({ message: "Email is required" })
  @IsEmail({}, { message: "Enter a valid email address" })
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: "+2348012345678" })
  @IsNotEmpty({ message: "Phone number is required" })
  @IsString()
  @MinLength(10, { message: "Enter a valid phone number" })
  @MaxLength(20)
  @Matches(/^\+?[0-9\s\-()]{10,20}$/, { message: "Enter a valid phone number" })
  phone: string;

  @ApiProperty({ minLength: 8 })
  @IsNotEmpty({ message: "Password is required" })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(128, { message: "Password must not exceed 128 characters" })
  password: string;
}
