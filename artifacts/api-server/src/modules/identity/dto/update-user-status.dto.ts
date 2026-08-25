import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";

export enum UserStatusValue {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DEACTIVATED = "DEACTIVATED",
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatusValue })
  @IsNotEmpty()
  @IsEnum(UserStatusValue, {
    message: "status must be one of: PENDING, ACTIVE, SUSPENDED, DEACTIVATED",
  })
  status: UserStatusValue;
}
