import { Injectable, Logger } from "@nestjs/common";
import { AuthorizationService } from "../../authorization/authorization.service";
import { PrismaService } from "../../database/prisma.service";
import { OcppAuditService } from "../services/ocpp-audit.service";
import { ChargingAuthorizationPolicyService } from "../services/charging-authorization-policy.service";

@Injectable()
export class StartTransactionHandler {
  private readonly logger =
    new Logger(StartTransactionHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: OcppAuditService,
    private readonly authorizationService: AuthorizationService,
    private readonly chargingPolicy: ChargingAuthorizationPolicyService,
  ) {}

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


    let authorization;

    try {

      authorization =
        await this.authorizationService.authorize(
          idTag,
        );


      await this.chargingPolicy.canStartCharging(
        authorization.userId,
      );

    } catch(error) {

      this.logger.error(
        `Charging authorization failed during StartTransaction: ${idTag}`,
      );

      this.logger.error(
        error instanceof Error
          ? error.stack
          : JSON.stringify(error),
      );

      return {
        idTagInfo:{
          status:"Invalid",
        },
        transactionId:0,
      };
    }


    if (!connectorId || !idTag) {
      return {
        idTagInfo: {
          status: "Invalid",
        },
        transactionId: 0,
      };
    }


    const chargePoint =
      await this.prisma.chargePoint.findUnique({
        where: {
          id: chargePointId,
        },
      });


    if (!chargePoint) {
      this.logger.warn(
        `Unknown charge point ${chargePointId}`,
      );

      return {
        idTagInfo: {
          status: "Invalid",
        },
        transactionId: 0,
      };
    }


    const connector =
      await this.prisma.connector.findFirst({
        where: {
          connectorNumber: connectorId,
          chargePointId,
        },
      });


    if (!connector) {
      this.logger.warn(
        `Invalid connector ${connectorId} for ${chargePointId}`,
      );

      return {
        idTagInfo: {
          status: "Invalid",
        },
        transactionId: 0,
      };
    }


    const transaction =
      await this.prisma.ocppTransaction.create({
        data: {
          transactionId:
            Math.floor(
              Math.random() * 1000000000,
            ),

          chargePointId,

          connectorId: connector.id,

          stationId: connector.stationId,

          idTag,

          meterStart: meterStart ?? 0,

          status: "ACTIVE",

          startedAt: timestamp
            ? new Date(timestamp)
            : new Date(),
        },
      });


    this.logger.log(
      `OCPP transaction created ${transaction.transactionId}`,
    );

    /*
     * MODULE 5 PHASE 3:
     * Automatically create charging session
     * when OCPP StartTransaction succeeds.
     */

    const credential =
      await this.prisma.chargingCredential.findUnique({
        where:{
          identifier:idTag,
        },
        include:{
          user:true,
        },
      });


    if (credential) {

      const station =
        await this.prisma.station.findUnique({
          where:{
            id: transaction.stationId,
          },
        });


      if (station) {

        await this.prisma.chargingSession.create({
          data:{
            userId:
              credential.userId,

            stationId:
              station.id,

            status:
              "ACTIVE",

            energyWh:
              0,

            costKobo:
              0,

            tariffKoboPerKwh:
              station.tariffKoboPerKwh,

            powerKw:
              station.powerKw,
          },
        });

      }

    }


    await this.auditService.logTransactionEvent(
      chargePointId,
      transaction.transactionId,
      "START_TRANSACTION",
      "ACCEPTED",
      {
        connectorId,
        meterStart,
        idTag,
      },
    );


    return {
      transactionId:
        transaction.transactionId,

      idTagInfo: {
        status: "Accepted",
      },

      meterStart:
        transaction.meterStart,

      timestamp:
        transaction.startedAt.toISOString(),
    };
  }
}
