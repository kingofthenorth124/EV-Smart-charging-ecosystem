import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class StopTransactionHandler {

  private readonly logger =
    new Logger(StopTransactionHandler.name);


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


    return {
      idTagInfo: {
        status: "Accepted",
      },

      transactionId,

      meterStop:
        meterStop ?? 0,

      timestamp:
        timestamp ??
        new Date().toISOString(),

      reason:
        reason ??
        "Local",
    };
  }
}
