import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, Max, Min } from "class-validator";

export const TOPUP_METHODS = ["BANK_TRANSFER", "CARD", "USSD"] as const;
export type TopUpMethod = (typeof TOPUP_METHODS)[number];

export class TopUpDto {
  @ApiProperty({
    description: "Top-up amount in kobo (min ₦100)",
    example: 500000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(10000, { message: "Minimum top-up is ₦100" })
  @Max(100000000, { message: "Maximum top-up is ₦1,000,000" })
  amountKobo!: number;

  @ApiProperty({ enum: TOPUP_METHODS })
  @IsIn(TOPUP_METHODS)
  method!: TopUpMethod;
}
