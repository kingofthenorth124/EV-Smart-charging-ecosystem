import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  PAYMENT_PROVIDERS,
  type PaymentProvider,
  UpdatePaymentProviderConfigDto,
} from "./dto/update-payment-provider-config.dto";

@Injectable()
export class PaymentProviderConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig() {
    const config = await this.prisma.paymentProviderConfig.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

    if (config) {
      return config;
    }

    return this.prisma.paymentProviderConfig.create({
      data: {
        primaryProvider: "PAYSTACK",
        secondaryProvider: "INTERSWITCH",
        tertiaryProvider: "FLUTTERWAVE",
        automaticFailover: true,
      },
    });
  }

  async updateConfig(dto: UpdatePaymentProviderConfigDto) {
    const providers = [
      dto.primaryProvider,
      dto.secondaryProvider,
      dto.tertiaryProvider,
    ].filter(Boolean) as PaymentProvider[];

    if (new Set(providers).size !== providers.length) {
      throw new BadRequestException(
        "Primary, secondary and tertiary providers must be unique",
      );
    }

    if (providers.length === 0) {
      throw new BadRequestException(
        "At least one payment provider is required",
      );
    }

    const existing = await this.prisma.paymentProviderConfig.findFirst({
      orderBy: {
        createdAt: "asc",
      },
    });

    const data = {
      primaryProvider: dto.primaryProvider,
      secondaryProvider: dto.secondaryProvider ?? null,
      tertiaryProvider: dto.tertiaryProvider ?? null,
      automaticFailover: dto.automaticFailover ?? true,
    };

    if (existing) {
      return this.prisma.paymentProviderConfig.update({
        where: {
          id: existing.id,
        },
        data,
      });
    }

    return this.prisma.paymentProviderConfig.create({
      data: {
        ...data,
        primaryProvider: data.primaryProvider,
        secondaryProvider: data.secondaryProvider,
        tertiaryProvider: data.tertiaryProvider,
      },
    });
  }

  async getProviderOrder(): Promise<PaymentProvider[]> {
    const config = await this.getConfig();

    return [
      config.primaryProvider,
      config.secondaryProvider,
      config.tertiaryProvider,
    ].filter(Boolean) as PaymentProvider[];
  }

  isSupportedProvider(provider: string): provider is PaymentProvider {
    return (PAYMENT_PROVIDERS as readonly string[]).includes(provider);
  }
}
