import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { OcppGateway } from "./gateway/ocpp.gateway";
import { OcppConnectionService } from "./services/ocpp-connection.service";
import { OcppMessageRouter } from "./services/ocpp-message.router";
import { BootNotificationHandler } from "./handlers/boot-notification.handler";
import { HeartbeatHandler } from "./handlers/heartbeat.handler";

@Module({
  imports: [DatabaseModule],
  providers: [
    OcppGateway,
    OcppConnectionService,
    OcppMessageRouter,
    BootNotificationHandler,
    HeartbeatHandler,
  ],
})
export class OcppModule {}
