/**
 * NestJS test application factory.
 *
 * createApp()            – full app with ThrottlerGuard bypassed (all non-rate-limit tests)
 * createRateLimitApp()   – full app with real in-memory throttler (rate-limit tests only)
 *
 * Each call produces an independent NestJS application with its own DI container,
 * so in-memory throttler storage never leaks between test suites.
 */
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getStorageToken } from "@nestjs/throttler";
import helmet from "helmet";
import { AppModule } from "../app.module";
import { PrismaService } from "../modules/database/prisma.service";
import { PaystackProvider } from "../modules/payment/providers/paystack.provider";
import { InterswitchProvider } from "../modules/payment/providers/interswitch.provider";
import { FlutterwaveProvider } from "../modules/payment/providers/flutterwave.provider";
import { MockPaymentProvider } from "../modules/payment/providers/mock-payment.provider";

/**
 * No-op throttler storage — increment() always reports totalHits=1 so every
 * request is well within any limit. Used in the standard test app to prevent
 * rate-limit interference with functional tests.
 */
const noopThrottlerStorage = {
  async increment(_key: string, _ttl: number, _limit: number) {
    return {
      totalHits: 1,
      timeToExpire: 0,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  },
};

async function buildApp(
  overrideThrottler: boolean,
): Promise<{ app: INestApplication; prisma: PrismaService }> {
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PaystackProvider)
    .useClass(MockPaymentProvider)
    .overrideProvider(InterswitchProvider)
    .useClass(MockPaymentProvider)
    .overrideProvider(FlutterwaveProvider)
    .useClass(MockPaymentProvider);

  if (overrideThrottler) {
    // Override the throttler storage via its DI symbol so every increment()
    // reports totalHits=1 — safely under any limit, never blocking requests.
    builder = builder
      .overrideProvider(getStorageToken())
      .useValue(noopThrottlerStorage);
  }

  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication();

  // Mirror main.ts setup exactly
  app.setGlobalPrefix("api");
  app.use(helmet());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
      exceptionFactory: (errors) => new BadRequestException(errors),
    }),
  );

  await app.init();

  const prisma = moduleFixture.get(PrismaService);
  return { app, prisma };
}

/** Standard test app — ThrottlerGuard is a passthrough. */
export async function createApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  return buildApp(true);
}

/** Rate-limit test app — real in-memory ThrottlerGuard, fresh storage. */
export async function createRateLimitApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  return buildApp(false);
}
