import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ChargingSessionBridgeService } from "./charging-session-bridge.service";
import { OcppBillingService } from "./ocpp-billing.service";

@Injectable()
export class OcppTransactionReconciliationService {

  private readonly logger =
    new Logger(OcppTransactionReconciliationService.name);


  constructor(
    private readonly prisma: PrismaService,
    private readonly chargingSessionBridge:
      ChargingSessionBridgeService,

    private readonly billingService:
      OcppBillingService,
  ) {}


  async reconcile(
    transactionId: number,
  ) {

    const transaction =
      await this.prisma.ocppTransaction.findUnique({
        where: {
          transactionId,
        },
      });


    if (!transaction) {
      throw new Error(
        `OCPP transaction ${transactionId} not found`,
      );
    }


    if (transaction.status !== "COMPLETED") {
      return {
        reconciled: false,
        reason: "Transaction not completed",
      };
    }


    const energyWh =
      transaction.meterStop !== null &&
      transaction.meterStop >= transaction.meterStart
        ? transaction.meterStop - transaction.meterStart
        : transaction.energyWh;


    this.logger.log(
      `Reconciling OCPP transaction ${transactionId}: ${energyWh}Wh`,
    );


    await this.chargingSessionBridge.completeFromOcppTransaction(
      transactionId,
      energyWh,
    );

    const billing =
      await this.billingService.settleTransaction(
        transactionId,
        energyWh,
      );

    return {
      reconciled: true,

      transactionId,

      chargePointId:
        transaction.chargePointId,

      connectorId:
        transaction.connectorId,

      energyWh,

      startedAt:
        transaction.startedAt,

      stoppedAt:
        transaction.stoppedAt,

      billing,
    };
  }
}
