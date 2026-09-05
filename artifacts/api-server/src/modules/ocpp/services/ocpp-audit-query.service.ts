import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class OcppAuditQueryService {

  private readonly logger =
    new Logger(OcppAuditQueryService.name);


  constructor(
    private readonly prisma: PrismaService,
  ) {}


  async getEvents(filters: {
    chargePointId?: string;
    transactionId?: number;
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {

    const {
      chargePointId,
      transactionId,
      action,
      from,
      to,
      limit = 50,
      offset = 0,
    } = filters;


    const events =
      await this.prisma.ocppAuditEvent.findMany({

        where: {
          ...(chargePointId && {
            chargePointId,
          }),

          ...(transactionId && {
            transactionId,
          }),

          ...(action && {
            action,
          }),

          ...(from || to
            ? {
                createdAt: {
                  ...(from && {
                    gte: from,
                  }),

                  ...(to && {
                    lte: to,
                  }),
                },
              }
            : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        take: limit,

        skip: offset,
      });


    const total =
      await this.prisma.ocppAuditEvent.count({
        where: {
          ...(chargePointId && {
            chargePointId,
          }),

          ...(transactionId && {
            transactionId,
          }),

          ...(action && {
            action,
          }),
        },
      });


    this.logger.log(
      `Fetched ${events.length} OCPP audit events`,
    );


    return {
      total,

      limit,

      offset,

      events,
    };
  }


  async latestByChargePoint(
    chargePointId: string,
    limit = 20,
  ) {

    return this.prisma.ocppAuditEvent.findMany({
      where: {
        chargePointId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: limit,
    });
  }


  async transactionTimeline(
    transactionId: number,
  ) {

    return this.prisma.ocppAuditEvent.findMany({
      where: {
        transactionId,
      },

      orderBy: {
        createdAt: "asc",
      },
    });
  }
}
