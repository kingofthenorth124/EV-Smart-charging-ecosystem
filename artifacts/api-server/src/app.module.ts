import { ExecutionContext, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'http';
import { configuration, validate } from './common/config/app.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { DatabaseModule } from './modules/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { IdentityModule } from './modules/identity/identity.module';
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ChargingModule } from './modules/charging/charging.module';
import { EmailModule } from './common/email/email.module';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      expandVariables: true,
    }),

    // ── Structured logging (Pino) ─────────────────────────────────────────────
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>('LOG_LEVEL') ?? 'info',
          redact: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
          ],
          customProps: (req: IncomingMessage, _res: ServerResponse) => {
            const id = req.headers['x-correlation-id'];
            return { correlationId: Array.isArray(id) ? id[0] : id };
          },
          transport:
            config.get<string>('nodeEnv') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: false, translateTime: true },
                }
              : undefined,
        },
      }),
    }),

    // ── Rate limiting ─────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('RATE_LIMIT_TTL_MS') ?? 60000,
            limit: config.get<number>('RATE_LIMIT_MAX') ?? 100,
          },
        ],
        // Allow acceptance tests to bypass rate limiting in non-production.
        // Requires X-Acceptance-Test header matching ACCEPTANCE_TEST_KEY env var.
        // Never active when NODE_ENV=production, even if the header is present.
        skipIf: (context: ExecutionContext) => {
          if (process.env.NODE_ENV === 'production') return false;
          const secret = process.env.ACCEPTANCE_TEST_KEY;
          if (!secret) return false;
          const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
          return req.headers['x-acceptance-test'] === secret;
        },
      }),
    }),

    // ── JWT (global — shared by JwtAuthGuard and AuthService) ─────────────────
    // @nestjs/jwt v11 expiresIn uses the branded ms.StringValue type.
    // We cast to satisfy the type without importing ms directly.
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as any,
        },
      }),
    }),

    // ── Feature modules ───────────────────────────────────────────────────────
    DatabaseModule,
    HealthModule,
    AuditModule,
    IdentityModule,
    AuthModule,
    EmailModule,
    WalletModule,
    ChargingModule,
  ],

  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
