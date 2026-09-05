import {
  Body,
  Controller,
  Param,
  Post,
} from "@nestjs/common";

import { OcppCommandService } from "../services/ocpp-command.service";


@Controller("ocpp/commands")
export class OcppCommandController {

  constructor(
    private readonly commandService:
      OcppCommandService,
  ) {}


  @Post(":chargePointId/start")
  async start(
    @Param("chargePointId")
    chargePointId: string,

    @Body()
    body: {
      connectorId: number;
      idTag: string;
    },
  ) {

    return this.commandService.remoteStartTransaction(
      chargePointId,
      body.connectorId,
      body.idTag,
    );
  }



  @Post(":chargePointId/stop")
  async stop(
    @Param("chargePointId")
    chargePointId: string,

    @Body()
    body: {
      transactionId: number;
    },
  ) {

    return this.commandService.remoteStopTransaction(
      chargePointId,
      body.transactionId,
    );
  }



  @Post(":chargePointId/reset")
  async reset(
    @Param("chargePointId")
    chargePointId: string,

    @Body()
    body: {
      type?: "Hard" | "Soft";
    },
  ) {

    return this.commandService.reset(
      chargePointId,
      body.type ?? "Soft",
    );
  }



  @Post(":chargePointId/unlock")
  async unlock(
    @Param("chargePointId")
    chargePointId: string,

    @Body()
    body: {
      connectorId: number;
    },
  ) {

    return this.commandService.unlockConnector(
      chargePointId,
      body.connectorId,
    );
  }



  @Post(":chargePointId/availability")
  async availability(
    @Param("chargePointId")
    chargePointId: string,

    @Body()
    body: {
      connectorId: number;
      type: "Operative" | "Inoperative";
    },
  ) {

    return this.commandService.changeAvailability(
      chargePointId,
      body.connectorId,
      body.type,
    );
  }

}
