import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, Max, Min } from "class-validator";

export const PAYMENT_METHODS = [
  "BANK_TRANSFER",
  "CARD",
  "USSD",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class InitiatePaymentDto {
  @ApiProperty({
    description: "Amount in kobo",
    example: 500000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(10000)
  @Max(100000000)
  amountKobo!: number;

  @ApiProperty({
    enum: PAYMENT_METHODS,
  })
  @IsIn(PAYMENT_METHODS)
  method!: PaymentMethod;
}
