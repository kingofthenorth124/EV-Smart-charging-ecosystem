import {
  createHmac,
} from "node:crypto";

import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";

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
export class PaystackProvider implements PaymentProvider {
  readonly name = "PAYSTACK" as const;

  private readonly baseUrl =
    process.env.PAYSTACK_BASE_URL ??
    "https://api.paystack.co";

  private get secretKey(): string {
    const value = process.env.PAYSTACK_SECRET_KEY;

    if (!value) {
      throw new ServiceUnavailableException(
        "Paystack is not configured",
      );
    }

    return value;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}${path}`,
      {
        ...init,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      },
    );

    const body = (await response.json()) as T & {
      message?: string;
    };

    if (!response.ok) {
      throw new ServiceUnavailableException(
        body?.message ?? "Paystack request failed",
      );
    }

    return body;
  }

  async initiate(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentResult> {
    const body = await this.request<{
      status: boolean;
      data: {
        reference: string;
        authorization_url?: string;
        access_code?: string;
      };
    }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: input.customer.email,
        amount: String(input.amountKobo),
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: JSON.stringify({
          ...input.metadata,
          userId: input.customer.userId,
        }),
      }),
    });

    return {
      provider: this.name,
      providerReference: body.data.reference,
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code,
      status: "PENDING",
      raw: body,
    };
  }

  async verify(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    const body = await this.request<{
      data: {
        id: number;
        status: string;
        reference: string;
        amount: number;
        currency: string;
      };
    }>(
      `/transaction/verify/${encodeURIComponent(input.reference)}`,
      {
        method: "GET",
      },
    );

    const transaction = body.data;

    const successful =
      transaction.status === "success" &&
      transaction.amount === input.amountKobo &&
      transaction.currency === input.currency;

    return {
      provider: this.name,
      providerReference: String(transaction.id),
      reference: transaction.reference,
      amountKobo: transaction.amount,
      currency: transaction.currency,
      status: successful ? "SUCCESS" : "FAILED",
      raw: body,
    };
  }

  async refund(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentResult> {
    const body = await this.request<{
      data: {
        id: number;
        status: string;
        amount: number;
      };
    }>("/refund", {
      method: "POST",
      body: JSON.stringify({
        transaction:
          input.providerReference || input.reference,
        amount: input.amountKobo,
        currency: "NGN",
        customer_note: input.reason,
        merchant_note: input.reason,
      }),
    });

    const status =
      body.data.status === "processed"
        ? "COMPLETED"
        : body.data.status === "failed"
          ? "FAILED"
          : "PROCESSING";

    return {
      provider: this.name,
      refundReference: String(body.data.id),
      status,
      amountKobo: body.data.amount,
      raw: body,
    };
  }

  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | undefined>,
  ): boolean {
    const signature =
      headers["x-paystack-signature"];

    if (!signature) return false;

    const expected = createHmac(
      "sha512",
      this.secretKey,
    )
      .update(rawBody)
      .digest("hex");

    return expected === signature;
  }

  parseWebhook(
    rawBody: Buffer,
  ): WebhookResult {
    const payload = JSON.parse(
      rawBody.toString("utf8"),
    ) as {
      event?: string;
      data?: {
        reference?: string;
        id?: number;
      };
    };

    return {
      accepted: true,
      event: payload.event,
      reference: payload.data?.reference,
      providerReference:
        payload.data?.id !== undefined
          ? String(payload.data.id)
          : undefined,
    };
  }
}
