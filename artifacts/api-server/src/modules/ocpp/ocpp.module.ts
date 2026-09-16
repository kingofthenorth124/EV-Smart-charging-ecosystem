import { OcppPendingCommandService } from "./services/ocpp-pending-command.service";
import { Module } from "@nestjs/common";
import { AuthorizationModule } from "../authorization/authorization.module";
import { DatabaseModule } from "../database/database.module";

import { OcppGateway } from "./gateway/ocpp.gateway";
import { OcppAuditController } from "./controllers/ocpp-audit.controller";

import { OcppConnectionService } from "./services/ocpp-connection.service";
import { OcppConnectionRegistry } from "./services/ocpp-connection.registry";
import { OcppMessageRouter } from "./services/ocpp-message.router";

import { BootNotificationHandler } from "./handlers/boot-notification.handler";
import { HeartbeatHandler } from "./handlers/heartbeat.handler";
import { OcppTransactionReconciliationService } from "./services/ocpp-transaction-reconciliation.service";
import { ChargingSessionBridgeService } from "./services/charging-session-bridge.service";
import { WalletSettlementService } from "./services/wallet-settlement.service";
import { OcppAuditService } from "./services/ocpp-audit.service";
import { OcppAuditQueryService } from "./services/ocpp-audit-query.service";
import { OcppCommandService } from "./services/ocpp-command.service";
import { OcppCommandDispatcherService } from "./services/ocpp-command-dispatcher.service";
import { OcppCommandResponseService } from "./services/ocpp-command-response.service";
import { OcppCommandExecutorService } from "./services/ocpp-command-executor.service";


import { OcppCommandController } from "./controllers/ocpp-command.controller";
import { StatusNotificationHandler } from "./handlers/status-notification.handler";
import { AuthorizeHandler } from "./handlers/authorize.handler";
import { StartTransactionHandler } from "./handlers/start-transaction.handler";
import { MeterValuesHandler } from "./handlers/meter-values.handler";
import { StopTransactionHandler } from "./handlers/stop-transaction.handler";
import { ChargingAuthorizationPolicyService } from "./services/charging-authorization-policy.service";


@Module({
  imports: [
    DatabaseModule,
    AuthorizationModule,
  ],

  controllers: [
    OcppAuditController,
    OcppCommandController,
  ],

  providers: [
    OcppPendingCommandService,
    ChargingAuthorizationPolicyService,
    OcppGateway,

    OcppConnectionService,
    OcppConnectionRegistry,
    OcppMessageRouter,

    BootNotificationHandler,
    HeartbeatHandler,
    OcppTransactionReconciliationService,
    ChargingSessionBridgeService,
    WalletSettlementService,
    OcppAuditService,
    OcppAuditQueryService,
    OcppCommandService,
    OcppCommandDispatcherService,
    OcppCommandExecutorService,
    OcppCommandResponseService,
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