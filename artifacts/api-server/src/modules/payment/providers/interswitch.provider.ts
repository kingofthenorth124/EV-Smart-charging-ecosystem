import { Injectable, ServiceUnavailableException } from "@nestjs/common";

import type {
  InitiatePaymentInput,
  InitiatePaymentResult,
  PaymentProvider,
  RefundPaymentInput,
  RefundPaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
  WebhookResult,
} from "./payment-provider.interface";

@Injectable()
export class InterswitchProvider implements PaymentProvider {
  readonly name = "INTERSWITCH" as const;

  private readonly baseUrl =
    process.env.INTERSWITCH_BASE_URL ?? "https://sandbox.interswitchng.com";

  private get merchantCode(): string {
    const value = process.env.INTERSWITCH_MERCHANT_CODE;

    if (!value) {
      throw new ServiceUnavailableException(
        "Interswitch merchant code is not configured",
      );
    }

    return value;
  }

  private get payableCode(): string {
    const value = process.env.INTERSWITCH_PAYABLE_CODE;

    if (!value) {
      throw new ServiceUnavailableException(
        "Interswitch payable code is not configured",
      );
    }

    return value;
  }

  private get accessToken(): string {
    const value = process.env.INTERSWITCH_ACCESS_TOKEN;

    if (!value) {
      throw new ServiceUnavailableException(
        "Interswitch access token is not configured",
      );
    }

    return value;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    const body = (await response.json()) as T & {
      message?: string;
    };

    if (!response.ok) {
      throw new ServiceUnavailableException(
        body?.message ?? "Interswitch request failed",
      );
    }

    return body;
  }

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    const body = await this.request<{
      paymentUrl?: string;
      reference?: string;
      code?: string;
    }>("/paymentgateway/api/v1/paybill", {
      method: "POST",
      body: JSON.stringify({
        merchantCode: this.merchantCode,
        payableCode: this.payableCode,
        amount: String(input.amountKobo),
        redirectUrl: input.callbackUrl,
        customerId: input.customer.userId,
        customerEmail: input.customer.email,
        currencyCode: "566",
      }),
    });

    return {
      provider: this.name,
      providerReference: body.reference ?? input.reference,
      authorizationUrl: body.paymentUrl,
      status: "PENDING",
      raw: body,
    };
  }

  async verify(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const url = new URL(
      "/collections/api/v1/gettransaction.json",
      this.baseUrl,
    );

    url.searchParams.set("merchantcode", this.merchantCode);

    url.searchParams.set("transactionreference", input.reference);

    url.searchParams.set("amount", String(input.amountKobo));

    const body = await this.request<{
      Amount?: number;
      MerchantReference?: string;
      PaymentReference?: string;
      ResponseCode?: string;
      ResponseDescription?: string;
    }>(`${url.pathname}${url.search}`, {
      method: "GET",
    });

    const successful =
      body.ResponseCode === "00" && Number(body.Amount) === input.amountKobo;

    return {
      provider: this.name,
      providerReference:
        body.PaymentReference ?? input.providerReference ?? input.reference,
      reference: body.MerchantReference ?? input.reference,
      amountKobo: Number(body.Amount ?? 0),
      currency: input.currency,
      status: successful ? "SUCCESS" : "FAILED",
      raw: body,
    };
  }

  async refund(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    const refundReference = `REF-${input.reference}-${Date.now()}`;

    const body = await this.request<{
      refundReference?: string;
      refundAmount?: number;
      status?: string;
    }>("/paymentgateway/api/v1/refunds", {
      method: "POST",
      body: JSON.stringify({
        refundReference,
        parentPaymentId: input.providerReference,
        refundType: input.amountKobo <= 0 ? "FULL" : "PARTIAL",
        refundAmount: input.amountKobo,
        reason: input.reason,
      }),
    });

    const normalized = String(body.status ?? "").toUpperCase();

    const status =
      normalized === "FAILED"
        ? "FAILED"
        : normalized === "COMPLETE" || normalized === "SUCCESS"
          ? "COMPLETED"
          : "PROCESSING";

    return {
      provider: this.name,
      refundReference: body.refundReference ?? refundReference,
      status,
      amountKobo: Number(body.refundAmount ?? input.amountKobo),
      raw: body,
    };
  }

  verifyWebhook(
    _rawBody: Buffer,
    _headers: Record<string, string | undefined>,
  ): boolean {
    /*
     * Interswitch webhook authentication varies
     * by enabled product/account configuration.
     *
     * For the hosted/API-first flow we do NOT trust
     * the webhook as proof of value. We always perform
     * authoritative server-side verification.
     */
    return true;
  }

  parseWebhook(rawBody: Buffer): WebhookResult {
    const payload = JSON.parse(rawBody.toString("utf8")) as {
      transactionreference?: string;
      reference?: string;
      paymentReference?: string;
      responseCode?: string;
    };

    return {
      accepted: true,
      reference: payload.transactionreference ?? payload.reference,
      providerReference: payload.paymentReference,
    };
  }
}
