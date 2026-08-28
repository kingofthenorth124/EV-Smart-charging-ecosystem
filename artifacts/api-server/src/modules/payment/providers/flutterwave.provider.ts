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
export class FlutterwaveProvider
  implements PaymentProvider
{
  readonly name = "FLUTTERWAVE" as const;

  private readonly baseUrl =
    process.env.FLUTTERWAVE_BASE_URL ??
    "https://api.flutterwave.com";

  private get secretKey(): string {
    const value =
      process.env.FLUTTERWAVE_SECRET_KEY;

    if (!value) {
      throw new ServiceUnavailableException(
        "Flutterwave is not configured",
      );
    }

    return value;
  }

  private get webhookSecret(): string {
    return (
      process.env.FLUTTERWAVE_WEBHOOK_SECRET ??
      ""
    );
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
          Authorization:
            `Bearer ${this.secretKey}`,
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
        body?.message ??
          "Flutterwave request failed",
      );
    }

    return body;
  }

  async initiate(
    input: InitiatePaymentInput,
  ): Promise<InitiatePaymentResult> {
    const body =
      await this.request<{
        data: {
          link: string;
        };
      }>("/v3/payments", {
        method: "POST",
        body: JSON.stringify({
          tx_ref: input.reference,
          amount: input.amountKobo / 100,
          currency: input.currency,
          redirect_url: input.callbackUrl,
          customer: {
            email: input.customer.email,
            name: input.customer.name,
            phonenumber:
              input.customer.phone,
          },
          meta: {
            ...input.metadata,
            userId: input.customer.userId,
          },
        }),
      });

    return {
      provider: this.name,
      providerReference: input.reference,
      authorizationUrl:
        body.data.link,
      status: "PENDING",
      raw: body,
    };
  }

  async verify(
    input: VerifyPaymentInput,
  ): Promise<VerifyPaymentResult> {
    if (!input.providerReference) {
      throw new ServiceUnavailableException(
        "Flutterwave transaction ID is required",
      );
    }

    const body =
      await this.request<{
        data: {
          id: number;
          tx_ref: string;
          amount: number;
          currency: string;
          status: string;
        };
      }>(
        `/v3/transactions/${encodeURIComponent(
          input.providerReference,
        )}/verify`,
        {
          method: "GET",
        },
      );

    const transaction =
      body.data;

    const expectedAmount =
      input.amountKobo / 100;

    const successful =
      transaction.status ===
        "successful" &&
      transaction.tx_ref ===
        input.reference &&
      Number(transaction.amount) >=
        expectedAmount &&
      transaction.currency ===
        input.currency;

    return {
      provider: this.name,
      providerReference:
        String(transaction.id),
      reference:
        transaction.tx_ref,
      amountKobo:
        Math.round(
          Number(transaction.amount) * 100,
        ),
      currency:
        transaction.currency,
      status:
        successful
          ? "SUCCESS"
          : "FAILED",
      raw: body,
    };
  }

  async refund(
    input: RefundPaymentInput,
  ): Promise<RefundPaymentResult> {
    const body =
      await this.request<{
        data: {
          id?: number;
          status?: string;
          amount?: number;
        };
      }>("/v3/transactions/refund", {
        method: "POST",
        body: JSON.stringify({
          id: Number(
            input.providerReference,
          ),
          amount:
            input.amountKobo / 100,
          comments:
            input.reason,
        }),
      });

    const status =
      String(
        body.data.status ?? "",
      ).toLowerCase();

    return {
      provider: this.name,
      refundReference:
        body.data.id !== undefined
          ? String(body.data.id)
          : `FLW-REF-${Date.now()}`,
      status:
        status === "completed"
          ? "COMPLETED"
          : status === "failed"
            ? "FAILED"
            : "PROCESSING",
      amountKobo:
        Math.round(
          Number(
            body.data.amount ??
              input.amountKobo / 100,
          ) * 100,
        ),
      raw: body,
    };
  }

  verifyWebhook(
    rawBody: Buffer,
    headers: Record<string, string | undefined>,
  ): boolean {
    const signature =
      headers["flutterwave-signature"] ??
      headers["verif-hash"];

    if (!signature ||
        !this.webhookSecret) {
      return false;
    }

    const expected =
      createHmac(
        "sha256",
        this.webhookSecret,
      )
        .update(rawBody)
        .digest("base64");

    return expected === signature;
  }

  parseWebhook(
    rawBody: Buffer,
  ): WebhookResult {
    const payload =
      JSON.parse(
        rawBody.toString("utf8"),
      ) as {
        event?: string;
        type?: string;
        data?: {
          id?: number;
          tx_ref?: string;
        };
      };

    return {
      accepted: true,
      event:
        payload.event ??
        payload.type,
      reference:
        payload.data?.tx_ref,
      providerReference:
        payload.data?.id !== undefined
          ? String(
              payload.data.id,
            )
          : undefined,
    };
  }
}
