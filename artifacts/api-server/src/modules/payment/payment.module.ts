import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { WalletModule } from "../wallet/wallet.module";

import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";

import { PaymentProviderConfigController } from "./payment-provider-config.controller";
import { PaymentProviderConfigService } from "./payment-provider-config.service";

import { PaystackProvider } from "./providers/paystack.provider";
import { InterswitchProvider } from "./providers/interswitch.provider";
import { FlutterwaveProvider } from "./providers/flutterwave.provider";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";

@Module({
  imports: [AuditModule, WalletModule],

  controllers: [PaymentController, PaymentProviderConfigController],

  providers: [
    PaymentService,
    PaymentProviderConfigService,

    PaystackProvider,
    InterswitchProvider,
    FlutterwaveProvider,
    PaymentProviderRegistry,
  ],

  exports: [
    PaymentService,
    PaymentProviderConfigService,
    PaymentProviderRegistry,
  ],
})
export class PaymentModule {}
