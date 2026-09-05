import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class WalletSettlementService {

  private readonly logger =
    new Logger(WalletSettlementService.name);


  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async settleCharge(
    sessionId: string,
    costKobo: number,
  ) {

    const session =
      await this.prisma.chargingSession.findUnique({
        where: {
          id: sessionId,
        },
        include: {
          user: {
            include: {
              wallet: true,
            },
          },
        },
      });


    if (!session) {
      throw new Error(
        `Charging session ${sessionId} not found`,
      );
    }


    if (!session.user.wallet) {
      throw new Error(
        `Wallet not found for user ${session.userId}`,
      );
    }


    const wallet =
      session.user.wallet;


    const newBalance =
      wallet.balanceKobo - costKobo;


    const transaction =
      await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: session.userId,

          type: "CHARGE",

          amountKobo:
            -costKobo,

          balanceAfterKobo:
            newBalance,

          reference:
            `CHG-${Date.now()}`,

          description:
            "EV charging session payment",

          sessionId,
        },
      });


    await this.prisma.wallet.update({
      where: {
        id: wallet.id,
      },

      data: {
        balanceKobo:
          newBalance,
      },
    });


    this.logger.log(
      `Wallet charged ${costKobo} kobo for session ${sessionId}`,
    );


    return transaction;
  }
}
