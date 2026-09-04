import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class StatusNotificationHandler {
  private readonly logger = new Logger(StatusNotificationHandler.name);

  async handle(
    chargePointId: string,
    payload: any,
  ) {
    const {
      connectorId,
      status,
      errorCode,
    } = payload;

    this.logger.log(
      `Status update ${chargePointId} connector ${connectorId}: ${status}`,
    );

    return {
      status: "Accepted",
      connectorId,
      errorCode: errorCode ?? "NoError",
    };
  }
}
