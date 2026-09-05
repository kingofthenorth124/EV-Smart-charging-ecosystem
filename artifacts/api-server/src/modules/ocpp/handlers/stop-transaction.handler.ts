import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class StopTransactionHandler {

  private readonly logger =
    new Logger(StopTransactionHandler.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async handle(
    chargePointId: string,
    payload: any,
  ) {

    const {
      transactionId,
      meterStop,
      timestamp,
      reason,
    } = payload;


    this.logger.log(
      `StopTransaction received from ${chargePointId} transaction ${transactionId}`,
    );


    if (!transactionId) {
      return {
        idTagInfo: {
          status: "Invalid",
        },
      };
    }


    const transaction =
      await this.prisma.ocppTransaction.findUnique({
        where: {
          transactionId,
        },
      });


    if (!transaction) {

      this.logger.warn(
        `Unknown OCPP transaction ${transactionId}`,
      );

      return {
        idTagInfo: {
          status: "Invalid",
        },
      };
    }


    const updated =
      await this.prisma.ocppTransaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          status: "COMPLETED",

          meterStop:
            meterStop ?? transaction.meterStop,

          stoppedAt:
            timestamp
              ? new Date(timestamp)
              : new Date(),

          stopReason:
            reason ?? "Local",
        },
      });


    this.logger.log(
      `OCPP transaction completed ${transactionId}`,
    );


    return {
      idTagInfo: {
        status: "Accepted",
      },

      transactionId:
        updated.transactionId,

      meterStop:
        updated.meterStop ?? 0,

      timestamp:
        updated.stoppedAt?.toISOString()
        ?? new Date().toISOString(),

      reason:
        updated.stopReason
        ?? "Local",
    };
  }
}
