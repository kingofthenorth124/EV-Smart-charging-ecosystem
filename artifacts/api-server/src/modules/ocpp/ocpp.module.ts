import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";

import { OcppGateway } from "./gateway/ocpp.gateway";

import { OcppConnectionService } from "./services/ocpp-connection.service";
import { OcppConnectionRegistry } from "./services/ocpp-connection.registry";
import { OcppMessageRouter } from "./services/ocpp-message.router";

import { BootNotificationHandler } from "./handlers/boot-notification.handler";
import { HeartbeatHandler } from "./handlers/heartbeat.handler";
import { OcppTransactionReconciliationService } from "./services/ocpp-transaction-reconciliation.service";
import { StatusNotificationHandler } from "./handlers/status-notification.handler";
import { AuthorizeHandler } from "./handlers/authorize.handler";
import { StartTransactionHandler } from "./handlers/start-transaction.handler";
import { MeterValuesHandler } from "./handlers/meter-values.handler";
import { StopTransactionHandler } from "./handlers/stop-transaction.handler";


@Module({
  imports: [
    DatabaseModule,
  ],

  providers: [
    OcppGateway,

    OcppConnectionService,
    OcppConnectionRegistry,
    OcppMessageRouter,

    BootNotificationHandler,
    HeartbeatHandler,
    OcppTransactionReconciliationService,
    StatusNotificationHandler,
    AuthorizeHandler,
    StartTransactionHandler,
    MeterValuesHandler,
    StopTransactionHandler,
  ],

  exports: [
    OcppConnectionRegistry,
  ],
})
export class OcppModule {}
