/**
 * Prisma v7 configuration.
 * Provides the database connection string for `prisma migrate` and `prisma generate`.
 *
 * The runtime PrismaClient receives its connection via `datasourceUrl` in
 * PrismaService (see artifacts/api-server/src/modules/database/prisma.service.ts).
 */
import { defineConfig } from 'prisma/config';

export default defineConfig({
  migrate: {
    connectionString: process.env.DATABASE_URL as string,
  },
});
