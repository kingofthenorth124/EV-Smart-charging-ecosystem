import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class StartTransactionHandler {
  private readonly logger =
    new Logger(StartTransactionHandler.name);


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


    this.logger.log(
      `StartTransaction request from ${chargePointId}`,
    );


    if (!connectorId || !idTag) {
      return {
        idTagInfo: {
          status: "Invalid",
        },
        transactionId: 0,
      };
    }


    const transactionId =
      Date.now();


    this.logger.log(
      `Transaction started ${transactionId} on connector ${connectorId}`,
    );


    return {
      transactionId,
      idTagInfo: {
        status: "Accepted",
      },
      meterStart: meterStart ?? 0,
      timestamp:
        timestamp ??
        new Date().toISOString(),
    };
  }
}
