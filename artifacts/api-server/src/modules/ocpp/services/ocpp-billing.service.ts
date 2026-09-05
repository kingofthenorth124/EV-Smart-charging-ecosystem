import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class OcppBillingService {

  private readonly logger =
    new Logger(OcppBillingService.name);


  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async settleTransaction(
    transactionId: number,
    energyWh: number,
  ) {

    const transaction =
      await this.prisma.ocppTransaction.findUnique({
        where: {
          transactionId,
        },
        include: {
          station: true,
        },
      });


    if (!transaction) {
      throw new Error(
        `OCPP transaction ${transactionId} not found`,
      );
    }


    const energyKwh =
      energyWh / 1000;


    const costKobo =
      Math.ceil(
        energyKwh *
        transaction.station.tariffKoboPerKwh,
      );


    this.logger.log(
      `Billing transaction ${transactionId}: ${energyKwh}kWh = ${costKobo} kobo`,
    );


    return {
      transactionId,

      energyWh,

      energyKwh,

      tariff:
        transaction.station.tariffKoboPerKwh,

      costKobo,
    };
  }
}
