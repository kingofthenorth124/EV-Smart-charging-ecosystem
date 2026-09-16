import { PrismaService } from "../../database/prisma.service";
import { Injectable, Logger } from '@nestjs/common';
import { OcppConnectionRegistry } from "./ocpp-connection.registry";

@Injectable()
export class OcppCommandService {


  private readonly logger = new Logger(OcppCommandService.name);

  private readonly prisma: PrismaService;

  private registry: OcppConnectionRegistry;


  constructor(
    private readonly prismaService: PrismaService,
    registry: OcppConnectionRegistry,
  ) {

    this.prisma = prismaService;
    this.registry = registry;

  }







  async createCommand(data: {

    chargePointId: string;

    command: string;

    payload?: any;

  }) {


    const charger =
      await this.prisma.chargePoint.findUnique({
        where:{
          id:data.chargePointId,
        },
      });


    if (!charger) {

      return {
        accepted:false,
        reason:"Unknown charger",
      };

    }


    if (!this.registry.isConnected(data.chargePointId)) {

      return {
        accepted:false,
        reason:"Charger offline",
      };

    }




    const socket =
      this.registry.get(
        charger.id,
      );



    if (!socket) {

      this.logger.warn(
        `Offline charger rejected ${charger.id}`,
      );


      return {
        accepted:false,
        reason:"CHARGER_OFFLINE",
      };

    }



    const command =
      await this.prisma.ocppCommand.create({

        data: {

          chargePointId:
            charger.id,

          command:
            data.command,

          payload:
            data.payload,

          status:
            "PENDING",

        },

      });



    this.logger.log(
      `Created OCPP command ${command.id}`,
    );


    if (
      command &&
      "accepted" in command && command.accepted === false
    ) {
      return command;
    }


    return {
      accepted:true,
      command,
    };

  }



  async markSent(id:string){

    return this.prisma.ocppCommand.update({

      where:{
        id
      },

      data:{

        status:"SENT",

        sentAt:new Date(),

      },

    });

  }




  async markCompleted(
    id:string,
    response:any
  ){

    return this.prisma.ocppCommand.update({

      where:{
        id
      },

      data:{

        status:"ACCEPTED",

        response,

        completedAt:new Date(),

      },

    });

  }





  async markFailed(
    id:string,
    response:any
  ){

    return this.prisma.ocppCommand.update({

      where:{
        id
      },

      data:{

        status:"FAILED",

        response,

        completedAt:new Date(),

      },

    });

  }




  async getPending(){

    return this.prisma.ocppCommand.findMany({

      where:{
        status:"PENDING"
      },

      orderBy:{
        createdAt:"asc"
      }

    });

  }



  async remoteStartTransaction(
    chargePointId: string,
    connectorId: number,
    idTag: string
  ) {

    const command =
      await this.createCommand({
        chargePointId,
        command: "RemoteStartTransaction",
        payload: {
          connectorId,
          idTag
        }
      });


    if (
      command &&
      "accepted" in command && command.accepted === false
    ) {
      return command;
    }


    return {
      accepted:true,
      command,
    };

  }



  async remoteStopTransaction(
    chargePointId: string,
    transactionId: number
  ) {

    const command =
      await this.createCommand({
        chargePointId,
        command: "RemoteStopTransaction",
        payload: {
          transactionId
        }
      });


    if (
      command &&
      "accepted" in command && command.accepted === false
    ) {
      return command;
    }


    return {
      accepted:true,
      command,
    };

  }



  async reset(
    chargePointId: string,
    type: "Soft" | "Hard" = "Soft"
  ) {

    const command =
      await this.createCommand({
        chargePointId,
        command: "Reset",
        payload:{
          type
        }
      });


    if (
      command &&
      "accepted" in command && command.accepted === false
    ) {
      return command;
    }


    return {
      accepted:true,
      command,
    };

  }



  async unlockConnector(
    chargePointId: string,
    connectorId: number
  ) {

    const command =
      await this.createCommand({
        chargePointId,
        command:"UnlockConnector",
        payload:{
          connectorId
        }
      });


    if (
      command &&
      "accepted" in command && command.accepted === false
    ) {
      return command;
    }


    return {
      accepted:true,
      command,
    };

  }



  async changeAvailability(
    chargePointId: string,
    connectorId: number,
    type: "Operative" | "Inoperative"
  ) {

    const command =
      await this.createCommand({
        chargePointId,
        command:"ChangeAvailability",
        payload:{
          connectorId,
          type
        }
      });


    if (
      command &&
      "accepted" in command && command.accepted === false
    ) {
      return command;
    }


    return {
      accepted:true,
      command,
    };

  }





  async getCommand(commandId: string) {

    return this.prisma.ocppCommand.findUnique({
      where: {
        id: commandId,
      },
    });

  }




}
