import { Injectable, Logger } from "@nestjs/common";
import { OcppConnectionRegistry } from "./ocpp-connection.registry";
import { buildCallFrame } from "../core/ocpp-frame.builder";
import { OcppAuditService } from "./ocpp-audit.service";


@Injectable()
export class OcppCommandService {

  private readonly logger =
    new Logger(OcppCommandService.name);


  constructor(
    private readonly registry:
      OcppConnectionRegistry,

    private readonly auditService:
      OcppAuditService,
  ) {}


  /**
   * Send RemoteStartTransaction
   */
  async remoteStartTransaction(
    chargePointId: string,
    connectorId: number,
    idTag: string,
  ) {

    return this.sendCommand(
      chargePointId,
      "RemoteStartTransaction",
      {
        connectorId,
        idTag,
      },
    );
  }


  /**
   * Send RemoteStopTransaction
   */
  async remoteStopTransaction(
    chargePointId: string,
    transactionId: number,
  ) {

    return this.sendCommand(
      chargePointId,
      "RemoteStopTransaction",
      {
        transactionId,
      },
    );
  }


  /**
   * Reset charger
   */
  async reset(
    chargePointId: string,
    type: "Hard" | "Soft" = "Soft",
  ) {

    return this.sendCommand(
      chargePointId,
      "Reset",
      {
        type,
      },
    );
  }


  /**
   * Unlock connector
   */
  async unlockConnector(
    chargePointId: string,
    connectorId: number,
  ) {

    return this.sendCommand(
      chargePointId,
      "UnlockConnector",
      {
        connectorId,
      },
    );
  }


  /**
   * Change charger availability
   */
  async changeAvailability(
    chargePointId: string,
    connectorId: number,
    type: "Operative" | "Inoperative",
  ) {

    return this.sendCommand(
      chargePointId,
      "ChangeAvailability",
      {
        connectorId,
        type,
      },
    );
  }


  /**
   * Central command dispatcher
   * Gateway integration comes next
   */
  private async sendCommand(
    chargePointId: string,
    action: string,
    payload: any,
  ) {

    const frame =
      buildCallFrame(
        action,
        payload,
      );


    const sent =
      this.registry.send(
        chargePointId,
        frame,
      );


    this.logger.log(
      `OCPP command ${action} dispatch to ${chargePointId}: ${sent}`,
    );


    await this.auditService.logEvent({
      chargePointId,

      action,

      status:
        sent
          ? "SENT"
          : "FAILED",

      payload,
    });


    return {
      accepted: sent,

      chargePointId,

      action,

      payload,

      frame,

      timestamp:
        new Date().toISOString(),
    };
  }
}
