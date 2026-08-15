/**
 * Camel Mobility Wallet — API Server Bootstrap
 *
 * NestJS application entry point.
 * All HTTP routes are served under the '/api' global prefix to match
 * the reverse-proxy routing configuration.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // ── Logger ─────────────────────────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ── Global prefix ──────────────────────────────────────────────────────────
  // All controller routes are served under /api.
  // Swagger docs are configured separately at /api/docs.
  app.setGlobalPrefix('api');

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger ────────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Camel Mobility Wallet API')
      .setDescription(
        'Smart EV Charging Payment Platform — REST API\n\n' +
          'All monetary amounts are expressed in **kobo** (100 kobo = ₦1).\n' +
          'Minimum wallet balance for charging: **₦50,000 (5,000,000 kobo)**.',
      )
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addTag('health', 'Platform health and status')
      .addTag('auth', 'Authentication and token management')
      .addTag('customers', 'Customer profile management')
      .addTag('wallet', 'Wallet balance and transactions')
      .addTag('nfc-cards', 'NFC/RFID card lifecycle management')
      .addTag('stations', 'Charging station discovery and status')
      .addTag('sessions', 'Charging session management')
      .addTag('dashboard', 'Dashboard aggregation endpoint')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    // Path is absolute (not relative to global prefix)
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    });
  }

  // ── Listen ─────────────────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(
    `🐪 Camel Mobility Wallet API running on port ${port}`,
    'Bootstrap',
  );
  logger.log(
    `📖 Swagger docs available at http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
