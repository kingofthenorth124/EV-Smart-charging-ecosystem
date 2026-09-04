import { Injectable } from "@nestjs/common";

import { BootNotificationHandler } from "../handlers/boot-notification.handler";
import { HeartbeatHandler } from "../handlers/heartbeat.handler";
import { StatusNotificationHandler } from "../handlers/status-notification.handler";
import { AuthorizeHandler } from "../handlers/authorize.handler";
import { StartTransactionHandler } from "../handlers/start-transaction.handler";
import { MeterValuesHandler } from "../handlers/meter-values.handler";
import { StopTransactionHandler } from "../handlers/stop-transaction.handler";


@Injectable()
export class OcppMessageRouter {

  constructor(
    private readonly bootNotificationHandler: BootNotificationHandler,
    private readonly heartbeatHandler: HeartbeatHandler,
    private readonly statusNotificationHandler: StatusNotificationHandler,
    private readonly authorizeHandler: AuthorizeHandler,
    private readonly startTransactionHandler: StartTransactionHandler,
    private readonly meterValuesHandler: MeterValuesHandler,
    private readonly stopTransactionHandler: StopTransactionHandler,
  ) {}


  async route(
    chargePointId: string,
    action: string,
    payload: any,
  ) {

    switch (action) {

      case "BootNotification":
        return this.bootNotificationHandler.handle(
          chargePointId,
          payload,
        );


      case "Heartbeat":
        return this.heartbeatHandler.handle(
          chargePointId,
        );


      case "StatusNotification":
        return this.statusNotificationHandler.handle(
          chargePointId,
          payload,
        );


      case "Authorize":
        return this.authorizeHandler.handle(
          chargePointId,
          payload,
        );


      case "StartTransaction":
        return this.startTransactionHandler.handle(
          chargePointId,
          payload,
        );


      case "MeterValues":
        return this.meterValuesHandler.handle(
          chargePointId,
          payload,
        );


      case "StopTransaction":
        return this.stopTransactionHandler.handle(
          chargePointId,
          payload,
        );


      default:
        throw new Error(
          `Unsupported OCPP action: ${action}`,
        );
    }
  }
}
