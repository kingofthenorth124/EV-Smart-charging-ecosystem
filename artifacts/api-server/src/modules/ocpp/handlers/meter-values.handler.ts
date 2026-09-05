import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class MeterValuesHandler {
  private readonly logger =
    new Logger(MeterValuesHandler.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async handle(
    chargePointId: string,
    payload: any,
  ) {

    const {
      connectorId,
      transactionId,
      meterValue,
    } = payload;


    this.logger.log(
      `MeterValues received from ${chargePointId} connector ${connectorId}`,
    );


    if (!transactionId || !meterValue) {
      return {
        accepted: false,
      };
    }


    const transaction =
      await this.prisma.ocppTransaction.findUnique({
        where: {
          transactionId,
        },
      });


    if (!transaction) {
      this.logger.warn(
        `Unknown transaction ${transactionId}`,
      );

      return {
        accepted: false,
      };
    }


    const samples = Array.isArray(meterValue)
      ? meterValue
      : [];


    let energyWh =
      transaction.energyWh;


    for (const entry of samples) {

      const values =
        entry.sampledValue ?? [];


      for (const sample of values) {

        if (
          sample.measurand === "Energy.Active.Import.Register" ||
          !sample.measurand
        ) {

          const parsed =
            Number(sample.value);


          if (!Number.isNaN(parsed)) {
            energyWh = Math.floor(parsed);
          }
        }
      }
    }


    await this.prisma.ocppTransaction.update({
      where: {
        id: transaction.id,
      },

      data: {
        energyWh,
        lastMeterValueAt: new Date(),
      },
    });


    this.logger.log(
      `Transaction ${transactionId} energy updated ${energyWh}Wh`,
    );


    return {
      accepted: true,
    };
  }
}
