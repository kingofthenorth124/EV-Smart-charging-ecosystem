import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { OcppConnectionRegistry } from './ocpp-connection.registry';


@Injectable()
export class OcppCommandDispatcherService {

  private readonly logger =
    new Logger(OcppCommandDispatcherService.name);


  private prisma: PrismaClient;


  constructor(
    private readonly connectionRegistry: OcppConnectionRegistry
  ) {

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });


    this.prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });

  }



  async dispatchPendingCommands() {


    const commands =
      await this.prisma.ocppCommand.findMany({

        where:{
          status:"PENDING"
        },

        orderBy:{
          createdAt:"asc"
        },

        take:20

      });



    for (const command of commands) {

      try {

        await this.dispatch(command);


      } catch(error:any) {


        this.logger.error(
          `Command dispatch failed ${command.id}`,
          error.message
        );


      }

    }


  }




  private async dispatch(command:any) {


    const connection =
      this.connectionRegistry.get(
        command.chargePointId
      );


    if (!connection) {


      this.logger.warn(
        `Charge point offline ${command.chargePointId}`
      );


      return;

    }



    const uniqueId =
      `cmd-${command.id}`;



    const frame = JSON.stringify([

      2,

      uniqueId,

      command.command,

      command.payload || {}

    ]);



    connection.send(frame);



    await this.prisma.ocppCommand.update({

      where:{
        id:command.id
      },

      data:{

        status:"SENT",

        sentAt:new Date()

      }

    });



    this.logger.log(
      `OCPP command sent ${command.command}`
    );


  }


}
