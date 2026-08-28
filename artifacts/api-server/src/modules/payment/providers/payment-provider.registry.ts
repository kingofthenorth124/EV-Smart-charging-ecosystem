import { Injectable, NotFoundException } from "@nestjs/common";
import {
  PaymentProvider,
  PaymentProviderName,
} from "./payment-provider.interface";
import { PaystackProvider } from "./paystack.provider";
import { InterswitchProvider } from "./interswitch.provider";
import { FlutterwaveProvider } from "./flutterwave.provider";

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers: Map<
    PaymentProviderName,
    PaymentProvider
  >;

  constructor(
    private readonly paystack: PaystackProvider,
    private readonly interswitch: InterswitchProvider,
    private readonly flutterwave: FlutterwaveProvider,
  ) {
    this.providers = new Map<PaymentProviderName, PaymentProvider>([
      ["PAYSTACK", this.paystack],
      ["INTERSWITCH", this.interswitch],
      ["FLUTTERWAVE", this.flutterwave],
    ]);
  }

  get(provider: PaymentProviderName): PaymentProvider {
    const implementation = this.providers.get(provider);

    if (!implementation) {
      throw new NotFoundException(
        `Payment provider ${provider} is not registered`,
      );
    }

    return implementation;
  }

  has(provider: PaymentProviderName): boolean {
    return this.providers.has(provider);
  }
}
