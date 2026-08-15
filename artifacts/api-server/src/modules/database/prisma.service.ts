import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps PrismaClient for NestJS dependency injection.
 *
 * Global singleton via DatabaseModule (isGlobal: true).
 * All domain services inject PrismaService directly.
 *
 * Connection lifecycle:
 * - onModuleInit: establishes the database connection
 * - onModuleDestroy: gracefully disconnects on shutdown
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { level: 'query', emit: 'event' },
              { level: 'error', emit: 'stdout' },
              { level: 'warn', emit: 'stdout' },
            ]
          : [{ level: 'error', emit: 'stdout' }],
    });
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
    this.logger.log('Database connection closed');
  }
}
