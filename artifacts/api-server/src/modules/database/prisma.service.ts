import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

/**
 * PrismaService wraps PrismaClient for NestJS dependency injection.
 *
 * Prisma v7 requires a driver adapter — the connection URL can no longer be
 * passed directly to the PrismaClient constructor or embedded in schema.prisma.
 * We use @prisma/adapter-pg to bridge pg (node-postgres) with Prisma v7.
 *
 * DATABASE_URL is provided by Replit's managed PostgreSQL at runtime.
 * Migration config lives in artifacts/api-server/prisma.config.ts.
 *
 * Global singleton via DatabaseModule (isGlobal: true).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: pg.Pool;

  constructor() {
    // Create pg connection pool and Prisma v7 driver adapter
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { level: 'error', emit: 'stdout' },
              { level: 'warn', emit: 'stdout' },
            ]
          : [{ level: 'error', emit: 'stdout' }],
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log('Database connection closed');
  }
}
