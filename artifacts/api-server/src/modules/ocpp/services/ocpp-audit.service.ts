import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class OcppAuditService {

  private readonly logger =
    new Logger(OcppAuditService.name);


  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async logEvent(data: {
    chargePointId: string;
    action: string;
    status: string;
    transactionId?: number;
    connectorId?: string;
    payload?: any;
  }) {

    const event =
      await this.prisma.ocppAuditEvent.create({
        data: {
          chargePointId:
            data.chargePointId,

          transactionId:
            data.transactionId,

          connectorId:
            data.connectorId,

          action:
            data.action,

          status:
            data.status,

          payload:
            data.payload ?? {},
        },
      });


    this.logger.log(
      `OCPP audit recorded: ${data.action}`,
    );


    return event;
  }


  async logTransactionEvent(
    chargePointId: string,
    transactionId: number | undefined,
    action: string,
    status: string,
    payload?: any,
  ) {

    return this.logEvent({
      chargePointId,
      transactionId,
      action,
      status,
      payload,
    });
  }
}
