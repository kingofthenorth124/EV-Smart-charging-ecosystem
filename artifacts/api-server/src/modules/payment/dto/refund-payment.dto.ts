import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class RefundPaymentDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  amountKobo?: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
