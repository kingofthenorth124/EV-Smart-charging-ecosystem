import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";

import { OcppGateway } from "./gateway/ocpp.gateway";

import { OcppConnectionService } from "./services/ocpp-connection.service";
import { OcppConnectionRegistry } from "./services/ocpp-connection.registry";
import { OcppMessageRouter } from "./services/ocpp-message.router";

import { BootNotificationHandler } from "./handlers/boot-notification.handler";
import { HeartbeatHandler } from "./handlers/heartbeat.handler";
import { StatusNotificationHandler } from "./handlers/status-notification.handler";


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
    StatusNotificationHandler,
  ],

  exports: [
    OcppConnectionRegistry,
  ],
})
export class OcppModule {}
