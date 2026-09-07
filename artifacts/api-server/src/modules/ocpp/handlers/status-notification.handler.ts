import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ChargePointStatus } from "@prisma/client";

const OCPP_STATUS_MAP: Record<string, ChargePointStatus> = {
  Available: ChargePointStatus.AVAILABLE,
  Preparing: ChargePointStatus.PREPARING,
  Charging: ChargePointStatus.CHARGING,
  SuspendedEVSE: ChargePointStatus.SUSPENDED,
  SuspendedEV: ChargePointStatus.SUSPENDED,
  Finishing: ChargePointStatus.FINISHING,
  Reserved: ChargePointStatus.AVAILABLE,
  Unavailable: ChargePointStatus.UNAVAILABLE,
  Faulted: ChargePointStatus.FAULTED,
};

@Injectable()
export class StatusNotificationHandler {
  private readonly logger = new Logger(StatusNotificationHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(chargePointId: string, payload: any) {
    const { connectorId, status, errorCode } = payload;

    const mappedStatus = OCPP_STATUS_MAP[status];

    if (!mappedStatus) {
      this.logger.warn(
        `Unrecognized OCPP status "${status}" from ${chargePointId} connector ${connectorId} — skipping persistence`,
      );
      return {};
    }

    try {
      await this.prisma.connector.update({
        where: {
          chargePointId_connectorNumber: {
            chargePointId,
            connectorNumber: connectorId,
          },
        },
        data: { status: mappedStatus },
      });

      this.logger.log(
        `Status update ${chargePointId} connector ${connectorId}: ${status} -> ${mappedStatus}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to persist status for ${chargePointId} connector ${connectorId}: ${(err as Error).message}`,
      );
    }

    // OCPP 1.6 spec: StatusNotification.conf has an empty payload
    return {};
  }
}
