import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { OcppAuditService } from "../services/ocpp-audit.service";

export interface BootNotificationPayload {
  vendor?: string;
  model?: string;
  firmwareVersion?: string;
}

export interface BootNotificationResult {
  status: "Accepted";
  currentTime: string;
  interval: number;
}

const HEARTBEAT_INTERVAL_SECONDS = 60;

@Injectable()
export class BootNotificationHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: OcppAuditService,
  ) {}

  async handle(
    chargePointId: string,
    payload: BootNotificationPayload,
  ): Promise<BootNotificationResult> {
    const chargePoint = await this.prisma.chargePoint.findUnique({
      where: { id: chargePointId },
    });

    if (!chargePoint) {
      throw new NotFoundException(`Unknown charge point: ${chargePointId}`);
    }

    const now = new Date();

    await this.prisma.chargePoint.update({
      where: { id: chargePointId },
      data: {
        vendor: payload.vendor ?? chargePoint.vendor,
        model: payload.model ?? chargePoint.model,
        firmwareVersion:
          payload.firmwareVersion ?? chargePoint.firmwareVersion,
        status: "AVAILABLE",
        lastHeartbeat: now,
      },
    });

    await this.auditService.logTransactionEvent(
      chargePointId,
      undefined,
      "BOOT_NOTIFICATION",
      "ACCEPTED",
      {
        vendor: payload.vendor,
        model: payload.model,
        firmwareVersion: payload.firmwareVersion,
      },
    );

    return {
      status: "Accepted",
      currentTime: now.toISOString(),
      interval: HEARTBEAT_INTERVAL_SECONDS,
    };
  }
}
