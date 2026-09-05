import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { WalletSettlementService } from "./wallet-settlement.service";

@Injectable()
export class ChargingSessionBridgeService {

  private readonly logger =
    new Logger(ChargingSessionBridgeService.name);


  constructor(
    private readonly prisma: PrismaService,

    private readonly walletSettlement:
      WalletSettlementService,
  ) {}


  async completeFromOcppTransaction(
    transactionId: number,
    energyWh: number,
  ) {

    const ocppTransaction =
      await this.prisma.ocppTransaction.findUnique({
        where: {
          transactionId,
        },

        include: {
          station: true,
        },
      });


    if (!ocppTransaction) {
      throw new Error(
        `OCPP transaction ${transactionId} not found`,
      );
    }


    const session =
      await this.prisma.chargingSession.findFirst({
        where: {
          status: "ACTIVE",
          stationId:
            ocppTransaction.stationId,
        },
      });


    if (!session) {
      return {
        bridged: false,
        reason: "No active charging session found",
        transactionId,
      };
    }


    const costKobo =
      Math.ceil(
        (energyWh / 1000) *
        ocppTransaction.station.tariffKoboPerKwh,
      );


    const updated =
      await this.prisma.chargingSession.update({
        where: {
          id: session.id,
        },

        data: {
          energyWh,

          costKobo,

          status:
            "COMPLETED",

          endedAt:
            new Date(),
        },
      });


    const walletTransaction =
      await this.walletSettlement.settleCharge(
        updated.id,
        costKobo,
      );


    this.logger.log(
      `Charging session ${updated.id} completed and wallet charged`,
    );


    return {
      bridged: true,

      sessionId:
        updated.id,

      transactionId,

      energyWh,

      costKobo,

      walletTransactionId:
        walletTransaction.id,
    };
  }
}
