import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class MeterValuesHandler {

  private readonly logger =
    new Logger(MeterValuesHandler.name);


  async handle(
    chargePointId: string,
    payload: any,
  ) {

    const {
      connectorId,
      meterValue,
    } = payload;


    this.logger.log(
      `MeterValues received from ${chargePointId} connector ${connectorId}`,
    );


    if (!meterValue) {
      return {};
    }


    const samples =
      Array.isArray(meterValue)
        ? meterValue
        : [];


    const readings = samples.map(
      (entry: any) => ({
        timestamp:
          entry.timestamp ??
          new Date().toISOString(),

        sampledValues:
          entry.sampledValue ?? [],
      }),
    );


    return {
      accepted: true,
      connectorId,
      readings,
    };
  }
}
