import { Injectable, Logger } from "@nestjs/common";
import { OcppConnectionRegistry } from "./ocpp-connection.registry";
import { buildCallFrame } from "../core/ocpp-frame.builder";
import { OcppAuditService } from "./ocpp-audit.service";
import { PrismaService } from "../../database/prisma.service";
import { OcppPendingCommandService } from "./ocpp-pending-command.service";


@Injectable()
export class OcppCommandService {

  private readonly logger =
    new Logger(OcppCommandService.name);


  constructor(
    private readonly registry:
      OcppConnectionRegistry,

    private readonly auditService:
      OcppAuditService,

    private readonly prisma:
      PrismaService,

    private readonly pendingCommands:
      OcppPendingCommandService,
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


    const chargePoint =
      await this.prisma.chargePoint.findUnique({
        where: {
          id: chargePointId,
        },
        select: {
          id: true,
        },
      });


    if (!chargePoint) {
      this.logger.warn(
        `Cannot dispatch ${action}: unknown charge point ${chargePointId}`,
      );

      await this.auditService.logEvent({
        chargePointId,
        action,
        status: "FAILED",
        payload,
      });

      return {
        accepted: false,
        chargePointId,
        action,
        payload,
        frame,
        timestamp: new Date().toISOString(),
      };
    }


    const sent =
      this.registry.send(
        chargePoint.id,
        frame,
      );


    if (!sent) {

      this.logger.warn(
        `OCPP command failed dispatch ${action} ${chargePointId}`,
      );

    }


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
