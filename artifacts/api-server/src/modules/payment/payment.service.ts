import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { WalletService } from "../wallet/wallet.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";
import { PAYMENT_AUDIT_ACTIONS } from "./audit-actions";
import { PAYMENT_EVENTS } from "./payment-events";
import type { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import type { RefundPaymentDto } from "./dto/refund-payment.dto";

function generatePaymentReference(): string {
  return `PAY-${randomBytes(6).toString("hex").toUpperCase()}`;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly events: EventEmitter2,
  ) {}

  async initiate(
    userId: string,
    dto: InitiatePaymentDto,
    correlationId?: string,
  ) {
    const wallet = await this.walletService.getOrCreateWallet(userId);

    if (wallet.status !== "ACTIVE") {
      throw new ConflictException("Wallet is suspended");
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        walletId: wallet.id,
        amountKobo: dto.amountKobo,
        currency: "NGN",
        provider: "SANDBOX",
        reference: generatePaymentReference(),
        method: dto.method,
        status: "PENDING",
      },
    });

    await this.auditService.log({
      actorId: userId,
      action: PAYMENT_AUDIT_ACTIONS.PAYMENT_CREATED,
      resource: "payment",
      resourceId: payment.id,
      result: "SUCCESS",
      correlationId,
      metadata: {
        amountKobo: payment.amountKobo,
        reference: payment.reference,
        method: payment.method,
      },
    });

    this.events.emit(PAYMENT_EVENTS.PAYMENT_INITIATED, {
      paymentId: payment.id,
      userId,
      amountKobo: payment.amountKobo,
      reference: payment.reference,
      correlationId,
    });

    return payment;
  }

  async complete(providerReference: string, correlationId?: string) {
    if (
      typeof providerReference !== "string" ||
      providerReference.trim().length === 0
    ) {
      throw new BadRequestException("providerReference is required");
    }

    const payment = await this.prisma.payment.findUnique({
      where: {
        providerReference,
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    /*
     * Idempotency:
     *
     * A payment provider can deliver the same webhook multiple times.
     * A completed payment must never credit the wallet twice.
     */
    if (payment.status === "COMPLETED") {
      return payment;
    }

    const completed = await this.prisma.$transaction(async (tx) => {
      /*
       * Atomically claim the payment.
       *
       * Only PENDING/PROCESSING payments can transition to COMPLETED.
       * If another request already claimed it, count === 0 and we
       * return the current payment without touching the wallet.
       */
      const claimed = await tx.payment.updateMany({
        where: {
          id: payment.id,
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
        data: {
          status: "COMPLETED",
          providerReference,
          paidAt: new Date(),
        },
      });

      if (claimed.count === 0) {
        return tx.payment.findUniqueOrThrow({
          where: {
            id: payment.id,
          },
        });
      }

      const wallet = await tx.wallet.findUniqueOrThrow({
        where: {
          id: payment.walletId,
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balanceKobo: {
            increment: payment.amountKobo,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: payment.userId,
          type: "TOPUP",
          status: "COMPLETED",
          amountKobo: payment.amountKobo,
          balanceAfterKobo: updatedWallet.balanceKobo,
          reference: payment.reference,
          description: `Wallet top-up via ${payment.method ?? "payment"}`,
          method: payment.method,
        },
      });

      return tx.payment.findUniqueOrThrow({
        where: {
          id: payment.id,
        },
      });
    });

    await this.auditService.log({
      actorId: payment.userId,
      action: PAYMENT_AUDIT_ACTIONS.PAYMENT_COMPLETED,
      resource: "payment",
      resourceId: payment.id,
      result: "SUCCESS",
      correlationId,
      metadata: {
        amountKobo: payment.amountKobo,
        reference: payment.reference,
        providerReference,
      },
    });

    this.events.emit(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
      paymentId: payment.id,
      userId: payment.userId,
      amountKobo: payment.amountKobo,
      reference: payment.reference,
      providerReference,
      correlationId,
    });

    return completed;
  }

  /**
   * Verify an incoming webhook's signature for the given provider.
   * Called by PaymentWebhookController before any payload is trusted.
   */
  verifyWebhookSignature(
    providerName: Parameters<PaymentProviderRegistry["get"]>[0],
    rawBody: Buffer,
    headers: Record<string, string | undefined>,
  ): boolean {
    return this.providerRegistry.get(providerName).verifyWebhook(rawBody, headers);
  }

  /**
   * Process a provider webhook payload once its signature has already been
   * verified by the caller. Delegates to the existing idempotent complete()
   * logic — a payment already COMPLETED is a safe no-op, per the idempotency
   * guarantee documented there.
   */
  async processVerifiedWebhook(
    providerName: Parameters<PaymentProviderRegistry["get"]>[0],
    rawBody: Buffer,
    correlationId?: string,
  ) {
    const parsed = this.providerRegistry.get(providerName).parseWebhook(rawBody);

    if (!parsed.providerReference) {
      throw new BadRequestException("Webhook payload missing provider reference");
    }

    return this.complete(parsed.providerReference, correlationId);
  }

  /**
   * Refund a completed payment through its original provider, reverse the
   * wallet credit, and record a PaymentRefund. Only COMPLETED payments may
   * be refunded; a payment already refunded is rejected, not silently
   * repeated — refunds are not idempotent the way webhook completion is,
   * since a duplicate refund *should* be a distinct error, not a no-op.
   */
  async refund(
    paymentId: string,
    dto: RefundPaymentDto,
    correlationId?: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }
    if (payment.status !== "COMPLETED") {
      throw new ConflictException(
        `Cannot refund payment in status ${payment.status}`,
      );
    }

    const existingRefund = await this.prisma.paymentRefund.findFirst({
      where: { paymentId: payment.id },
    });
    if (existingRefund) {
      throw new ConflictException("Payment has already been refunded");
    }

    const amountKobo = dto.amountKobo ?? payment.amountKobo;
    const provider = this.providerRegistry.get(
      payment.provider as Parameters<PaymentProviderRegistry["get"]>[0],
    );

    const providerResult = await provider.refund({
      reference: payment.reference,
      providerReference: payment.providerReference ?? "",
      amountKobo,
      reason: dto.reason,
    });

    const refund = await this.prisma.$transaction(async (tx) => {
      const created = await tx.paymentRefund.create({
        data: {
          paymentId: payment.id,
          provider: payment.provider,
          providerReference: payment.providerReference ?? "",
          refundReference: providerResult.refundReference,
          amountKobo,
          reason: dto.reason,
          status: providerResult.status,
          completedAt:
            providerResult.status === "COMPLETED" ? new Date() : null,
        },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" },
      });

      return created;
    });

    await this.walletService.debitForRefund(
      payment.userId,
      amountKobo,
      refund.refundReference,
      `Refund for payment ${payment.reference}`,
      correlationId,
    );

    await this.auditService.log({
      actorId: payment.userId,
      action: PAYMENT_AUDIT_ACTIONS.PAYMENT_REFUNDED,
      resource: "payment",
      resourceId: payment.id,
      result: "SUCCESS",
      correlationId,
      metadata: {
        amountKobo,
        refundReference: refund.refundReference,
        reason: dto.reason,
      },
    });

    this.events.emit(PAYMENT_EVENTS.PAYMENT_REFUNDED, {
      paymentId: payment.id,
      userId: payment.userId,
      amountKobo,
      refundReference: refund.refundReference,
      reason: dto.reason,
      correlationId,
    });

    return refund;
  }
}
