/**
 * Camel Mobility Wallet — API Server Bootstrap
 * NestJS entry point for the Identity & Access Management backend.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // ── Logger (Pino) ────────────────────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ── Global prefix ─────────────────────────────────────────────────────────
  // All controller routes served under /api.
  // Swagger docs configured separately at /api/docs (absolute path).
  app.setGlobalPrefix('api');

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID'],
  });

  // ── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  // ── Swagger (development only) ────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Camel Mobility Wallet API')
      .setDescription(
        '**Module 1**: Enterprise Foundation, Identity & Access Management\n\n' +
          'Correlation ID (`X-Correlation-ID`) is included in every response.\n\n' +
          'Use POST `/api/v1/auth/login` to obtain a Bearer token.',
      )
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'BearerAuth')
      .addTag('health', 'Platform health and operational status')
      .addTag('system', 'System information')
      .addTag('auth', 'Authentication, registration, and password management')
      .addTag('users', 'User identity and account management (admin)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        tagsSorter: 'alpha',
      },
    });
  }

  // ── Listen ────────────────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`🐪 Camel Mobility API listening on port ${port}`, 'Bootstrap');
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📖 Swagger UI → http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}

bootstrap().catch((error: unknown) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
