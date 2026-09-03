import {Module} from "@nestjs/common";

import {PaymentService} from "./payment.service";
import {SettlementService} from "./settlement.service";
import {RefundService} from "./refund.service";

import {WalletModule} from "../wallet/wallet.module";
import {AuditModule} from "../audit/audit.module";
import {PaymentProviderRegistry} from "./providers/payment-provider.registry";
import {PaystackProvider} from "./providers/paystack.provider";
import {InterswitchProvider} from "./providers/interswitch.provider";
import {FlutterwaveProvider} from "./providers/flutterwave.provider";


@Module({

imports:[
WalletModule,
AuditModule,
],

providers:[

PaymentService,
SettlementService,
RefundService,
PaymentProviderRegistry,
PaystackProvider,
InterswitchProvider,
FlutterwaveProvider

],

exports:[

PaymentService,
SettlementService,
RefundService

]

})

export class PaymentModule {}
