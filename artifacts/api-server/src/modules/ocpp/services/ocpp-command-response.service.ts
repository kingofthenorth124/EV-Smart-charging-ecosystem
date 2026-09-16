import { PrismaService } from "../../database/prisma.service";
import { Injectable, Logger } from '@nestjs/common';


@Injectable()
export class OcppCommandResponseService {


  private readonly logger = new Logger(
    OcppCommandResponseService.name
  );

  private readonly prisma: PrismaService;


  constructor(
    prismaService: PrismaService,
  ) {

    this.prisma = prismaService;

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


    if (command.status !== "SENT") {

      this.logger.warn(
        `Ignoring duplicate response for command ${commandId} with status ${command.status}`
      );

      return command;

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


    const command =
      await this.prisma.ocppCommand.findUnique({
        where: {
          id: commandId,
        },
      });


    if (!command) {

      this.logger.warn(
        `Cannot fail missing command ${commandId}`
      );

      return null;

    }


    if (command.status !== "SENT") {

      this.logger.warn(
        `Ignoring failure update for command ${commandId} with status ${command.status}`
      );

      return command;

    }


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