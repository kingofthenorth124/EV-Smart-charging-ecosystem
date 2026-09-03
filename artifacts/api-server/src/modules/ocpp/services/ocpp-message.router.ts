import { Injectable } from "@nestjs/common";
import {
  BootNotificationHandler,
  BootNotificationPayload,
} from "../handlers/boot-notification.handler";
import { HeartbeatHandler } from "../handlers/heartbeat.handler";

@Injectable()
export class OcppMessageRouter {
  constructor(
    private readonly bootNotificationHandler: BootNotificationHandler,
    private readonly heartbeatHandler: HeartbeatHandler,
  ) {}

  async route(
    chargePointId: string,
    action: string,
    payload: unknown,
  ): Promise<unknown> {
    switch (action) {
      case "BootNotification":
        return this.bootNotificationHandler.handle(
          chargePointId,
          (payload ?? {}) as BootNotificationPayload,
        );

      case "Heartbeat":
        return this.heartbeatHandler.handle(chargePointId);

      default:
        return { error: `Unsupported OCPP action: ${action}` };
    }
  }
}
