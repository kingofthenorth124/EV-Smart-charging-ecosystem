# Camel Mobility Wallet

A smart EV-charging payment platform for Nigerian operators: customers manage a prepaid wallet, tap an NFC card to charge, and pay from balance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/` — NestJS backend (auth, identity, JWT, RBAC, audit); global prefix `/api`, routes under `/api/v1/*`
- `artifacts/web/` — React + Vite frontend; auth pages in `src/pages/`, auth context in `src/hooks/use-auth.tsx`, token management in `src/lib/auth-tokens.ts`
- `lib/api-spec/openapi.yaml` — authoritative API contract; `pnpm --filter @workspace/api-spec run codegen` regenerates `lib/api-client-react` hooks and `lib/api-zod`
- `artifacts/web/src/index.css` — Camel Mobility theme (deep green 157 67% 18%, amber 41 100% 47%); design reference in `docs/ui-ux-reference.md`

## Architecture decisions

- The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the contract source of truth; the NestJS controllers were aligned to it (e.g. `/v1/auth/password/*` paths, `GET /v1/auth/me`)
- Frontend auth: access token in memory only; opaque refresh token in localStorage; silent refresh ~60s before expiry with single-flight rotation (`src/lib/auth-tokens.ts`)
- Every frontend API call carries a fresh `X-Correlation-ID` via `setDefaultHeadersGetter` in `@workspace/api-client-react`
- Self-registered users start as `PENDING` (login is allowed in PENDING; full activation is an admin action)

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
