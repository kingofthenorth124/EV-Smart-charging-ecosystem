/**
 * Prisma v7 configuration for the api-server package.
 *
 * Placing this file in artifacts/api-server/ ensures prisma generate
 * resolves @prisma/client from this package's node_modules (pnpm monorepo fix).
 *
 * The schema path is resolved relative to this config file location.
 * DATABASE_URL is provided by Replit's managed PostgreSQL (runtime env).
 */
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.resolve(__dirname, '../../prisma/schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
});
