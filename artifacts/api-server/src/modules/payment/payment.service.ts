import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "crypto";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { WalletService } from "../wallet/wallet.service";
import { PAYMENT_AUDIT_ACTIONS } from "./audit-actions";
import type { InitiatePaymentDto } from "./dto/initiate-payment.dto";

function generatePaymentReference(): string {
  return `PAY-${randomBytes(6).toString("hex").toUpperCase()}`;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly auditService: AuditService,
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

    return payment;
  }

  async complete(
    providerReference: string,
    correlationId?: string,
  ) {
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
     * A provider may deliver the same webhook more than once.
     * A payment that is already COMPLETED must never credit the
     * wallet again.
     */
    if (payment.status === "COMPLETED") {
      return payment;
    }

    const completed = await this.prisma.$transaction(async (tx) => {
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
          where: { id: payment.id },
        });
      }

      const wallet = await tx.wallet.findUniqueOrThrow({
        where: { id: payment.walletId },
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
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
        where: { id: payment.id },
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

    return completed;
  }
}
