import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, type Wallet, type WalletTransaction } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../database/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AUDIT_ACTIONS } from "./audit-actions";
import {
  paginate,
  type PaginatedResult,
} from "../../common/dto/pagination.dto";
import type { TopUpDto } from "./dto/topup.dto";
import type { ListTransactionsQueryDto } from "./dto/list-transactions-query.dto";

/** Minimum wallet balance required to start a charging session (kobo). ₦500 default. */
export const DEFAULT_MIN_BALANCE_KOBO = 50000;

export interface WalletSummaryDto {
  id: string;
  balanceKobo: number;
  minBalanceKobo: number;
  currency: "NGN";
  status: string;
  updatedAt: Date;
}

export interface TransactionDto {
  id: string;
  type: string;
  status: string;
  amountKobo: number;
  balanceAfterKobo: number;
  reference: string;
  description: string;
  method: string | null;
  sessionId: string | null;
  createdAt: Date;
}

function generateReference(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function toTransactionDto(tx: WalletTransaction): TransactionDto {
  return {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    amountKobo: tx.amountKobo,
    balanceAfterKobo: tx.balanceAfterKobo,
    reference: tx.reference,
    description: tx.description,
    method: tx.method,
    sessionId: tx.sessionId,
    createdAt: tx.createdAt,
  };
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  get minBalanceKobo(): number {
    return this.configService.get<number>(
      "wallet.minBalanceKobo",
      DEFAULT_MIN_BALANCE_KOBO,
    );
  }

  /**
   * Get the user's wallet, creating it on first access.
   * Concurrency-safe: a losing racer on the unique(userId) constraint
   * re-reads the wallet the winner created.
   */
  async getOrCreateWallet(userId: string): Promise<Wallet> {
    const existing = await this.prisma.wallet.findUnique({ where: { userId } });
    if (existing) return existing;

    try {
      const wallet = await this.prisma.wallet.create({ data: { userId } });
      await this.auditService.log({
        actorId: userId,
        action: AUDIT_ACTIONS.WALLET_CREATED,
        resource: "wallet",
        resourceId: wallet.id,
        result: "SUCCESS",
      });
      return wallet;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const wallet = await this.prisma.wallet.findUnique({
          where: { userId },
        });
        if (wallet) return wallet;
      }
      throw error;
    }
  }

  toSummary(wallet: Wallet): WalletSummaryDto {
    return {
      id: wallet.id,
      balanceKobo: wallet.balanceKobo,
      minBalanceKobo: this.minBalanceKobo,
      currency: "NGN",
      status: wallet.status,
      updatedAt: wallet.updatedAt,
    };
  }

  async getSummary(userId: string): Promise<WalletSummaryDto> {
    const wallet = await this.getOrCreateWallet(userId);
    return this.toSummary(wallet);
  }

  /**
   * Top up the wallet. In this environment the sandbox payment provider
   * settles instantly; the backend remains the authority for payment status.
   */
  async topUp(
    userId: string,
    dto: TopUpDto,
    correlationId?: string,
  ): Promise<{ transaction: TransactionDto; wallet: WalletSummaryDto }> {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.status !== "ACTIVE") {
      throw new ForbiddenException("Wallet is suspended — contact support");
    }

    const methodLabel = dto.method.replace(/_/g, " ").toLowerCase();
    const [updatedWallet, transaction] = await this.prisma.$transaction(
      async (tx) => {
        const updated = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceKobo: { increment: dto.amountKobo } },
        });
        const created = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: "TOPUP",
            status: "COMPLETED",
            amountKobo: dto.amountKobo,
            balanceAfterKobo: updated.balanceKobo,
            reference: generateReference("TOP"),
            description: `Wallet top-up via ${methodLabel}`,
            method: dto.method,
          },
        });
        return [updated, created] as const;
      },
    );

    await this.auditService.log({
      actorId: userId,
      action: AUDIT_ACTIONS.WALLET_TOPUP,
      resource: "wallet_transaction",
      resourceId: transaction.id,
      result: "SUCCESS",
      correlationId,
      metadata: {
        amountKobo: dto.amountKobo,
        method: dto.method,
        reference: transaction.reference,
      },
    });

    return {
      transaction: toTransactionDto(transaction),
      wallet: this.toSummary(updatedWallet),
    };
  }

  /**
   * Reverse a completed top-up following a provider-confirmed refund.
   * Mirrors topUp()'s transaction pattern exactly, decrementing instead of
   * incrementing. Balance floors at zero — a refund can never drive the
   * wallet negative even if funds were already spent elsewhere.
   */
  async debitForRefund(
    userId: string,
    amountKobo: number,
    reference: string,
    description: string,
    correlationId?: string,
  ): Promise<{ transaction: TransactionDto; wallet: WalletSummaryDto }> {
    const wallet = await this.getOrCreateWallet(userId);

    const [updatedWallet, transaction] = await this.prisma.$transaction(
      async (tx) => {
        const current = await tx.wallet.findUniqueOrThrow({
          where: { id: wallet.id },
        });
        const debit = Math.max(0, Math.min(amountKobo, current.balanceKobo));

        const updated = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceKobo: { decrement: debit } },
        });
        const created = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId,
            type: "REFUND",
            status: "COMPLETED",
            amountKobo: -debit,
            balanceAfterKobo: updated.balanceKobo,
            reference,
            description,
          },
        });
        return [updated, created] as const;
      },
    );

    await this.auditService.log({
      actorId: userId,
      action: AUDIT_ACTIONS.WALLET_CHARGED,
      resource: "wallet_transaction",
      resourceId: transaction.id,
      result: "SUCCESS",
      correlationId,
      metadata: {
        amountKobo: -transaction.amountKobo,
        reference: transaction.reference,
      },
    });

    return {
      transaction: toTransactionDto(transaction),
      wallet: this.toSummary(updatedWallet),
    };
  }

  /**
   * Debit the wallet for a charging session INSIDE an existing transaction.
   * The wallet row is re-read within the transaction so the debit is based on
   * the current balance, never a stale snapshot; balance floors at zero.
   * Caller must invoke auditDebit() after the transaction commits.
   */
  async debitForSessionTx(
    tx: Prisma.TransactionClient,
    userId: string,
    sessionId: string,
    costKobo: number,
    description: string,
  ): Promise<WalletTransaction> {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    const debit = Math.max(0, Math.min(costKobo, wallet.balanceKobo));

    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balanceKobo: { decrement: debit } },
    });
    return tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: "CHARGE",
        status: "COMPLETED",
        amountKobo: -debit,
        balanceAfterKobo: updated.balanceKobo,
        reference: generateReference("CHG"),
        description,
        sessionId,
      },
    });
  }

  /** Audit a committed session debit (called after the transaction commits). */
  async auditDebit(
    transaction: WalletTransaction,
    correlationId?: string,
  ): Promise<void> {
    await this.auditService.log({
      actorId: transaction.userId,
      action: AUDIT_ACTIONS.WALLET_CHARGED,
      resource: "wallet_transaction",
      resourceId: transaction.id,
      result: "SUCCESS",
      correlationId,
      metadata: {
        costKobo: -transaction.amountKobo,
        sessionId: transaction.sessionId,
        reference: transaction.reference,
      },
    });
  }

  async listTransactions(
    userId: string,
    query: ListTransactionsQueryDto,
  ): Promise<PaginatedResult<TransactionDto>> {
    const where = { userId, ...(query.type ? { type: query.type } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);
    return paginate(rows.map(toTransactionDto), total, query.page, query.limit);
  }

  async recentTransactions(
    userId: string,
    take = 5,
  ): Promise<TransactionDto[]> {
    const rows = await this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
    return rows.map(toTransactionDto);
  }
}
