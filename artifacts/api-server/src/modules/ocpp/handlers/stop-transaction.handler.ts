import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { OcppTransactionReconciliationService } from "../services/ocpp-transaction-reconciliation.service";

@Injectable()
export class StopTransactionHandler {

  private readonly logger =
    new Logger(StopTransactionHandler.name);


  constructor(
    private readonly prisma: PrismaService,
    private readonly reconciliation:
      OcppTransactionReconciliationService,
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
      await this.prisma.ocppTransaction.update({
        where: {
          transactionId,
        },

        data: {
          meterStop:
            meterStop ?? 0,

          status:
            "COMPLETED",

          stoppedAt:
            timestamp
              ? new Date(timestamp)
              : new Date(),

          stopReason:
            reason ?? "Local",
        },
      });


    const reconciliation =
      await this.reconciliation.reconcile(
        transaction.transactionId,
      );


    this.logger.log(
      `Transaction ${transactionId} reconciled`,
    );


    return {
      idTagInfo: {
        status: "Accepted",
      },

      transactionId,

      meterStop:
        transaction.meterStop,

      timestamp:
        transaction.stoppedAt?.toISOString(),

      reason:
        transaction.stopReason,

      reconciliation,
    };
  }
}
