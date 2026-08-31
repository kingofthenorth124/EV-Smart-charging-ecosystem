import { IsBoolean, IsIn, IsOptional } from "class-validator";

export const PAYMENT_PROVIDERS = [
  "PAYSTACK",
  "INTERSWITCH",
  "FLUTTERWAVE",
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export class UpdatePaymentProviderConfigDto {
  @IsIn(PAYMENT_PROVIDERS)
  primaryProvider!: PaymentProvider;

  @IsIn(PAYMENT_PROVIDERS)
  @IsOptional()
  secondaryProvider?: PaymentProvider;

  @IsIn(PAYMENT_PROVIDERS)
  @IsOptional()
  tertiaryProvider?: PaymentProvider;

  @IsBoolean()
  @IsOptional()
  automaticFailover?: boolean;
}
