import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class OcppCommandService {

  private readonly logger = new Logger(OcppCommandService.name);

  private prisma: PrismaClient;


  constructor() {

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });


    this.prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });

  }



  async createCommand(data: {

    chargePointId: string;

    command: string;

    payload?: any;

  }) {


    const command =
      await this.prisma.ocppCommand.create({

        data: {

          chargePointId: data.chargePointId,

          command: data.command,

          payload: data.payload,

          status: "PENDING",

        },

      });


    this.logger.log(
      `Created OCPP command ${command.id}`
    );


    return command;

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

    return this.createCommand({
      chargePointId,
      command: "RemoteStartTransaction",
      payload: {
        connectorId,
        idTag
      }
    });

  }



  async remoteStopTransaction(
    chargePointId: string,
    transactionId: number
  ) {

    return this.createCommand({
      chargePointId,
      command: "RemoteStopTransaction",
      payload: {
        transactionId
      }
    });

  }



  async reset(
    chargePointId: string,
    type: "Soft" | "Hard" = "Soft"
  ) {

    return this.createCommand({
      chargePointId,
      command: "Reset",
      payload: {
        type
      }
    });

  }



  async unlockConnector(
    chargePointId: string,
    connectorId: number
  ) {

    return this.createCommand({
      chargePointId,
      command: "UnlockConnector",
      payload: {
        connectorId
      }
    });

  }



  async changeAvailability(
    chargePointId: string,
    connectorId: number,
    type: "Operative" | "Inoperative"
  ) {

    return this.createCommand({
      chargePointId,
      command: "ChangeAvailability",
      payload: {
        connectorId,
        type
      }
    });

  }





  async getCommand(commandId: string) {

    return this.prisma.ocppCommand.findUnique({
      where: {
        id: commandId,
      },
    });

  }




}
