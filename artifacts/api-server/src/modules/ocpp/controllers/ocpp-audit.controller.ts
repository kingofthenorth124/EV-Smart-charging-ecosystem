import { Controller, Get, Query } from "@nestjs/common";
import { OcppAuditQueryService } from "../services/ocpp-audit-query.service";

@Controller("ocpp/audit")
export class OcppAuditController {

  constructor(
    private readonly auditQuery:
      OcppAuditQueryService,
  ) {}


  @Get()
  async getEvents(
    @Query("chargePointId")
    chargePointId?: string,

    @Query("transactionId")
    transactionId?: string,

    @Query("action")
    action?: string,

    @Query("limit")
    limit?: string,

    @Query("offset")
    offset?: string,
  ) {

    return this.auditQuery.getEvents({
      chargePointId,

      transactionId:
        transactionId
          ? Number(transactionId)
          : undefined,

      action,

      limit:
        limit
          ? Number(limit)
          : 50,

      offset:
        offset
          ? Number(offset)
          : 0,
    });
  }


  @Get("transaction")
  async transactionTimeline(
    @Query("transactionId")
    transactionId: string,
  ) {

    return this.auditQuery.transactionTimeline(
      Number(transactionId),
    );
  }


  @Get("charger")
  async chargerTimeline(
    @Query("chargePointId")
    chargePointId: string,
  ) {

    return this.auditQuery.latestByChargePoint(
      chargePointId,
    );
  }
}
