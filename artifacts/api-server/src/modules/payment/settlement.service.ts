import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { WalletService } from "../wallet/wallet.service";

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async settle(
    userId: string,
    sessionId: string,
    meterStart: number,
    meterStop: number,
    tariff: number,
  ) {
    const energy = meterStop - meterStart;
    if (energy <= 0) {
      throw new BadRequestException("Invalid meter reading");
    }

    const amountKobo = Math.round(energy * tariff);
    const reference = `CHARGE-${sessionId}`;

    const wallet = await this.prisma.wallet.findUniqueOrThrow({
      where: { userId },
    });

    await this.wallet.debit(userId, amountKobo, reference);

    return this.prisma.payment.create({
      data: {
        userId,
        walletId: wallet.id,
        amountKobo,
        provider: "MOCK",
        status: "COMPLETED",
        reference,
      },
    });
  }
}
