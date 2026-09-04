import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class StartTransactionHandler {
  private readonly logger =
    new Logger(StartTransactionHandler.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async handle(
    chargePointId: string,
    payload: any,
  ) {

    const {
      connectorId,
      idTag,
      meterStart,
      timestamp,
    } = payload;


    if (!connectorId || !idTag) {
      return {
        idTagInfo: {
          status: "Invalid",
        },
        transactionId: 0,
      };
    }


    const chargePoint =
      await this.prisma.chargePoint.findUnique({
        where: {
          id: chargePointId,
        },
      });


    if (!chargePoint) {
      this.logger.warn(
        `Unknown charge point ${chargePointId}`,
      );

      return {
        idTagInfo: {
          status: "Invalid",
        },
        transactionId: 0,
      };
    }


    const connector =
      await this.prisma.connector.findFirst({
        where: {
          id: connectorId,
          chargePointId,
        },
      });


    if (!connector) {
      this.logger.warn(
        `Invalid connector ${connectorId} for ${chargePointId}`,
      );

      return {
        idTagInfo: {
          status: "Invalid",
        },
        transactionId: 0,
      };
    }


    const transaction =
      await this.prisma.ocppTransaction.create({
        data: {
          transactionId: Math.floor(
            Date.now() / 1000,
          ),

          chargePointId,

          connectorId: connector.id,

          idTag,

          meterStart: meterStart ?? 0,

          status: "ACTIVE",

          startedAt: timestamp
            ? new Date(timestamp)
            : new Date(),
        },
      });


    this.logger.log(
      `OCPP transaction created ${transaction.transactionId}`,
    );


    return {
      transactionId:
        transaction.transactionId,

      idTagInfo: {
        status: "Accepted",
      },

      meterStart:
        transaction.meterStart,

      timestamp:
        transaction.startedAt.toISOString(),
    };
  }
}
