import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { WalletModule } from "../wallet/wallet.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";

@Module({
  imports: [
    AuditModule,
    WalletModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
