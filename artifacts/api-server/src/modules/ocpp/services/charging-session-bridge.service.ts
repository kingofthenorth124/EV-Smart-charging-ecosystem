import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ChargingSessionBridgeService {

  private readonly logger =
    new Logger(ChargingSessionBridgeService.name);


  constructor(
    private readonly prisma: PrismaService,
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
      });


    if (!ocppTransaction) {
      throw new Error(
        `OCPP transaction ${transactionId} not found`,
      );
    }


    this.logger.log(
      `Bridging OCPP transaction ${transactionId} into charging session`,
    );


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


    const updated =
      await this.prisma.chargingSession.update({
        where: {
          id: session.id,
        },

        data: {
          energyWh,

          status:
            "COMPLETED",

          endedAt:
            new Date(),
        },
      });


    this.logger.log(
      `Charging session ${updated.id} completed`,
    );


    return {
      bridged: true,

      sessionId:
        updated.id,

      transactionId,

      energyWh,
    };
  }
}
