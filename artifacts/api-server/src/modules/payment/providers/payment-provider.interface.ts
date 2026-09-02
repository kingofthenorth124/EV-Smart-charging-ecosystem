export type PaymentProviderName = "PAYSTACK" | "INTERSWITCH" | "FLUTTERWAVE" | "MOCK";

export type PaymentProviderStatus =
  "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "CANCELLED";

export interface PaymentCustomer {
  userId: string;
  email: string;
  name?: string;
  phone?: string;
}

export interface InitiatePaymentInput {
  reference: string;
  amountKobo: number;
  currency: string;
  customer: PaymentCustomer;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitiatePaymentResult {
  provider: PaymentProviderName;
  providerReference: string;
  authorizationUrl?: string;
  accessCode?: string;
  status: PaymentProviderStatus;
  raw?: unknown;
}

export interface VerifyPaymentInput {
  reference: string;
  amountKobo: number;
  currency: string;
  providerReference?: string;
}

export interface VerifyPaymentResult {
  provider: PaymentProviderName;
  providerReference: string;
  reference: string;
  amountKobo: number;
  currency: string;
  status: PaymentProviderStatus;
  raw?: unknown;
}

export interface RefundPaymentInput {
  reference: string;
  providerReference: string;
  amountKobo: number;
  reason: string;
}

export interface RefundPaymentResult {
  provider: PaymentProviderName;
  refundReference: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  amountKobo: number;
  raw?: unknown;
}

export interface WebhookResult {
  accepted: boolean;
  providerReference?: string;
  reference?: string;
  event?: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;

  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;

  verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;

  refund(input: RefundPaymentInput): Promise<RefundPaymentResult>;

  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | undefined>,
  ): boolean;

  parseWebhook(rawBody: Buffer): WebhookResult;
}
