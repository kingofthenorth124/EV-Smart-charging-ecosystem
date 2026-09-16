import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';


@Injectable()
export class OcppCommandResponseService {

  private readonly logger = new Logger(
    OcppCommandResponseService.name
  );

  private prisma: PrismaClient;


  constructor() {

    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });


    this.prisma = new PrismaClient({
      adapter: new PrismaPg(pool),
    });

  }


  /**
   * Handle OCPP CALLRESULT response
   */
  async handleResponse(
    commandId: string,
    response: any,
  ) {


    const command =
      await this.prisma.ocppCommand.findUnique({
        where: {
          id: commandId,
        },
      });


    if (!command) {

      this.logger.warn(
        `OCPP command ${commandId} not found`
      );

      return null;

    }


    const updated =
      await this.prisma.ocppCommand.update({

        where: {
          id: commandId,
        },

        data: {

          status: "COMPLETED",

          response,

          completedAt: new Date(),

        },

      });


    this.logger.log(
      `OCPP command completed: ${commandId}`
    );


    return updated;

  }



  /**
   * Mark failed command
   */
  async markFailed(
    commandId: string,
    error: any,
  ) {


    return this.prisma.ocppCommand.update({

      where: {
        id: commandId,
      },

      data: {

        status: "FAILED",

        response: error,

        completedAt: new Date(),

      },

    });


  }



  /**
   * Retrieve pending commands
   */
  async getPendingCommands(
    chargePointId: string,
  ) {


    return this.prisma.ocppCommand.findMany({

      where: {

        chargePointId,

        status: "SENT",

      },

      orderBy: {

        createdAt: "asc",

      },

    });


  }


}
