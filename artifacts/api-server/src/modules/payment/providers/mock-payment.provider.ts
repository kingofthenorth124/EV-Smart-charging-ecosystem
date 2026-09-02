import {
  PaymentProvider,
  InitiatePaymentInput,
  InitiatePaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  RefundPaymentInput,
  RefundPaymentResult,
  WebhookResult,
} from "./payment-provider.interface";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "MOCK" as const;

  async initiate(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentResult> {
    return {
      provider: this.name,
      providerReference: `mock_${input.reference}`,
      authorizationUrl: `https://mock-payment.local/pay/${input.reference}`,
      status: "PENDING",
    };
  }

  async verify(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    return {
      provider: this.name,
      providerReference: input.providerReference ?? `mock_${input.reference}`,
      reference: input.reference,
      amountKobo: input.amountKobo,
      currency: input.currency,
      status: "SUCCESS",
    };
  }

  async refund(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentResult> {
    return {
      provider: this.name,
      refundReference: `mock_refund_${input.reference}`,
      status: "COMPLETED",
      amountKobo: input.amountKobo,
    };
  }

  verifyWebhook(
    _rawBody: Buffer,
    _headers: Record<string, string | undefined>,
  ): boolean {
    return true;
  }

  parseWebhook(rawBody: Buffer): WebhookResult {
    const payload = JSON.parse(rawBody.toString("utf8"));
    return {
      accepted: true,
      providerReference: payload.providerReference,
      reference: payload.reference,
      event: payload.event,
    };
  }
}
