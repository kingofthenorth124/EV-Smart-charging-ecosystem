import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { WalletModule } from "../wallet/wallet.module";
import { ChargingController } from "./charging.controller";
import { ChargingService } from "./charging.service";
import { DashboardController } from "./dashboard.controller";

@Module({
  imports: [AuditModule, WalletModule],
  controllers: [ChargingController, DashboardController],
  providers: [ChargingService],
  exports: [ChargingService],
})
export class ChargingModule {}
