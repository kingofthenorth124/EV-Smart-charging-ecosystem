import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
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
          customProps: (req: { headers: Record<string, string> }) => ({
            correlationId: req.headers['x-correlation-id'],
          }),
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
      }),
    }),

    // ── JWT (global — shared by JwtAuthGuard and AuthService) ─────────────────
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
        },
      }),
    }),

    // ── Feature modules ───────────────────────────────────────────────────────
    DatabaseModule,
    HealthModule,
    AuditModule,
    IdentityModule,
    AuthModule,
  ],

  providers: [
    // Global exception filter — formats all errors per platform contract
    { provide: APP_FILTER, useClass: HttpExceptionFilter },

    // Correlation ID — injected on every request/response
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },

    // Rate limiting (runs before auth)
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // JWT auth — all routes protected by default; use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },

    // RBAC — enforces @Roles() decorator
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
