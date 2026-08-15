---
name: Prisma v7 + pnpm monorepo setup
description: Breaking changes in Prisma v7 and the exact workarounds needed in this pnpm workspace
---

## Prisma v7 Breaking Changes (all apply to this project)

1. **No `url` in schema datasource** — `url = env("DATABASE_URL")` in `datasource db {}` is rejected.
   - **Fix**: removed from `prisma/schema.prisma`; URL is in `artifacts/api-server/prisma.config.ts`

2. **`PrismaClient` requires a driver adapter** — `new PrismaClient({ datasourceUrl: '...' })` throws at runtime.
   - **Fix**: Install `@prisma/adapter-pg` + `pg`; pass `new PrismaPg(pool)` as `adapter` to constructor.
   - See `artifacts/api-server/src/modules/database/prisma.service.ts`

3. **`prisma generate` in pnpm monorepo** — Prisma resolves `@prisma/client` from the SCHEMA FILE's directory.
   - When schema is at `prisma/schema.prisma`, `@prisma/client` (installed in `artifacts/api-server/node_modules`) is invisible.
   - **Fix**: `artifacts/api-server/postinstall.cjs` copies schema to api-server dir, strips `output=` lines, runs generate, cleans up.

4. **`prisma migrate dev` needs `datasource.url` in config** — NOT `migrate.connectionString`.
   - Config key: `datasource: { url: process.env.DATABASE_URL }`
   - See `artifacts/api-server/prisma.config.ts`

5. **pnpm `@prisma/client` is a symlink** — the real package is in `.pnpm/<hash>/node_modules/@prisma/client`.
   - Prisma generates directly into the real path via the postinstall script. The symlink at `node_modules/@prisma/client` resolves correctly at import time.

**Why:** Prisma v7 was the only available version in the Replit package firewall (v6 has versions too old or too new for the firewall cutoff). All v7 breaking changes must be handled as documented above.

**How to apply:** Any future changes to `prisma/schema.prisma` require re-running `pnpm install` (triggers postinstall) or manually running `node artifacts/api-server/postinstall.cjs` from the workspace root. Migrations: `cd artifacts/api-server && ./node_modules/.bin/prisma migrate dev --name <name>`.
