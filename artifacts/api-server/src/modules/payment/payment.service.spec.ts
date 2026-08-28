import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PaymentService } from "./payment.service";

describe("PaymentService", () => {
  let service: PaymentService;

  const prisma = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    wallet: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const walletService = {
    getOrCreateWallet: jest.fn(),
  };

  const auditService = {
    log: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PaymentService(
      prisma as never,
      walletService as never,
      auditService as never,
    );
  });

  describe("initiate", () => {
    it("creates a pending sandbox payment for an active wallet", async () => {
      walletService.getOrCreateWallet.mockResolvedValue({
        id: "wallet-1",
        userId: "user-1",
        status: "ACTIVE",
        balanceKobo: 0,
      });

      const payment = {
        id: "payment-1",
        userId: "user-1",
        walletId: "wallet-1",
        amountKobo: 500000,
        currency: "NGN",
        provider: "SANDBOX",
        providerReference: null,
        reference: "PAY-ABC123",
        status: "PENDING",
        method: "CARD",
      };

      prisma.payment.create.mockResolvedValue(payment);
      auditService.log.mockResolvedValue(undefined);

      const result = await service.initiate(
        "user-1",
        {
          amountKobo: 500000,
          method: "CARD",
        },
        "corr-1",
      );

      expect(result).toEqual(payment);

      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          walletId: "wallet-1",
          amountKobo: 500000,
          currency: "NGN",
          provider: "SANDBOX",
          reference: expect.stringMatching(/^PAY-[A-F0-9]{12}$/),
          method: "CARD",
          status: "PENDING",
        },
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "user-1",
          action: "PaymentCreated",
          resource: "payment",
          resourceId: "payment-1",
          result: "SUCCESS",
          correlationId: "corr-1",
        }),
      );
    });

    it("rejects initiation when the wallet is suspended", async () => {
      walletService.getOrCreateWallet.mockResolvedValue({
        id: "wallet-1",
        userId: "user-1",
        status: "SUSPENDED",
        balanceKobo: 0,
      });

      await expect(
        service.initiate("user-1", {
          amountKobo: 500000,
          method: "CARD",
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe("complete", () => {
    it("rejects an empty provider reference", async () => {
      await expect(service.complete("")).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it("returns not found for an unknown provider reference", async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.complete("provider-ref-1")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("does not credit an already completed payment again", async () => {
      const payment = {
        id: "payment-1",
        userId: "user-1",
        walletId: "wallet-1",
        amountKobo: 500000,
        reference: "PAY-ABC123",
        providerReference: "provider-ref-1",
        status: "COMPLETED",
        method: "CARD",
      };

      prisma.payment.findUnique.mockResolvedValue(payment);

      const result = await service.complete("provider-ref-1");

      expect(result).toEqual(payment);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it("completes a pending payment and credits the wallet", async () => {
      const payment = {
        id: "payment-1",
        userId: "user-1",
        walletId: "wallet-1",
        amountKobo: 500000,
        reference: "PAY-ABC123",
        providerReference: "provider-ref-1",
        status: "PENDING",
        method: "CARD",
      };

      const completedPayment = {
        ...payment,
        status: "COMPLETED",
        paidAt: new Date(),
      };

      const tx = {
        payment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(completedPayment),
        },
        wallet: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: "wallet-1",
            userId: "user-1",
            balanceKobo: 100000,
          }),
          update: jest.fn().mockResolvedValue({
            id: "wallet-1",
            userId: "user-1",
            balanceKobo: 600000,
          }),
        },
        walletTransaction: {
          create: jest.fn().mockResolvedValue({
            id: "transaction-1",
          }),
        },
      };

      prisma.payment.findUnique.mockResolvedValue(payment);

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(tx);
      });

      auditService.log.mockResolvedValue(undefined);

      const result = await service.complete("provider-ref-1", "corr-1");

      expect(result).toEqual(completedPayment);

      expect(tx.payment.updateMany).toHaveBeenCalledWith({
        where: {
          id: "payment-1",
          status: {
            in: ["PENDING", "PROCESSING"],
          },
        },
        data: {
          status: "COMPLETED",
          providerReference: "provider-ref-1",
          paidAt: expect.any(Date),
        },
      });

      expect(tx.wallet.update).toHaveBeenCalledWith({
        where: {
          id: "wallet-1",
        },
        data: {
          balanceKobo: {
            increment: 500000,
          },
        },
      });

      expect(tx.walletTransaction.create).toHaveBeenCalledWith({
        data: {
          walletId: "wallet-1",
          userId: "user-1",
          type: "TOPUP",
          status: "COMPLETED",
          amountKobo: 500000,
          balanceAfterKobo: 600000,
          reference: "PAY-ABC123",
          description: "Wallet top-up via CARD",
          method: "CARD",
        },
      });

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: "user-1",
          action: "PaymentCompleted",
          resource: "payment",
          resourceId: "payment-1",
          result: "SUCCESS",
          correlationId: "corr-1",
        }),
      );
    });

    it("does not credit the wallet when the atomic payment claim loses a race", async () => {
      const payment = {
        id: "payment-1",
        userId: "user-1",
        walletId: "wallet-1",
        amountKobo: 500000,
        reference: "PAY-ABC123",
        providerReference: "provider-ref-1",
        status: "PENDING",
        method: "CARD",
      };

      const alreadyCompleted = {
        ...payment,
        status: "COMPLETED",
      };

      const tx = {
        payment: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(alreadyCompleted),
        },
        wallet: {
          findUniqueOrThrow: jest.fn(),
          update: jest.fn(),
        },
        walletTransaction: {
          create: jest.fn(),
        },
      };

      prisma.payment.findUnique.mockResolvedValue(payment);

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(tx);
      });

      const result = await service.complete("provider-ref-1");

      expect(result).toEqual(alreadyCompleted);

      expect(tx.wallet.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(tx.wallet.update).not.toHaveBeenCalled();
      expect(tx.walletTransaction.create).not.toHaveBeenCalled();
    });
  });
});
