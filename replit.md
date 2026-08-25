# Camel Mobility Wallet

A smart EV-charging payment platform for Nigerian operators: customers manage a prepaid wallet, tap an NFC card to charge, and pay from balance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/api-server run db:migrate` — apply pending Prisma migrations (dev)
- `pnpm --filter @workspace/api-server run db:migrate:prod` — apply migrations in production
- Required env: `DATABASE_URL` — Postgres connection string (runtime-managed by Replit)

### Bootstrapping the first SUPER_ADMIN

Self-registration always creates `CUSTOMER / PENDING` accounts. To create the first admin:

1. Set the following Replit Secrets (see `replit.md → Secrets`):
   - `ADMIN_BOOTSTRAP_SECRET` — any random string ≥ 16 chars (a one-time gate)
   - `ADMIN_EMAIL` — the admin's login email
   - `ADMIN_PHONE` — E.164 phone, e.g. `+2348012345678`
   - `ADMIN_PASSWORD` — initial password ≥ 12 chars (**change on first login**)
2. Run the seed from the Shell:
   ```
   pnpm --filter @workspace/api-server run seed:admin
   ```
3. Log in at `/login` with the email and password above.
4. Navigate to `/admin/users` to manage and activate `PENDING` customers.

The script is **idempotent** — re-running it with the same email is safe. If the account already exists as `SUPER_ADMIN`, it exits without changes. If the email exists with another role, it upgrades to `SUPER_ADMIN / ACTIVE`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/` — NestJS backend (auth, identity, wallet, charging, JWT, RBAC, audit); global prefix `/api`, routes under `/api/v1/*`
- `artifacts/web/` — React + Vite frontend; auth pages in `src/pages/`, auth context in `src/hooks/use-auth.tsx`, token management in `src/lib/auth-tokens.ts`
- `lib/api-spec/openapi.yaml` — authoritative API contract; `pnpm --filter @workspace/api-spec run codegen` regenerates `lib/api-client-react` hooks and `lib/api-zod`
- `artifacts/web/src/index.css` — Camel Mobility theme (deep green 157 67% 18%, amber 41 100% 47%); design reference in `docs/ui-ux-reference.md`

### Shared packages (`packages/`)

| Package                   | Purpose                                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@workspace/shared-types` | Canonical domain types: wallets, sessions, stations, events, audit                                                                                                                        |
| `@workspace/config`       | Runtime constants (kobo/naira, session limits) + env helpers                                                                                                                              |
| `@workspace/validation`   | Zod v4 schemas for all request bodies; import from `zod/v4` subpath                                                                                                                       |
| `@workspace/auth`         | RBAC helpers: `hasPermission`, `isAdminRole`, `isCustomerRole`                                                                                                                            |
| `@workspace/utils`        | Pure formatters: `formatDate`, `formatNaira`, `maskCardId`, etc.                                                                                                                          |
| `@workspace/ui`           | React component library (20 components). Variants live in `src/lib/variants.ts` (no JSX, fully testable in node). Consuming apps need `@source "../../../packages/ui/src"` in their CSS.  |
| `@workspace/sdk`          | Typed API client wrapping the generated `@workspace/api-client-react`. Use `createClient()`. SDK methods throw `SdkError` by default; wrap with `wrapResult()` for Result-style handling. |

## Architecture decisions

- The OpenAPI spec (`lib/api-spec/openapi.yaml`) is the contract source of truth; the NestJS controllers were aligned to it (e.g. `/v1/auth/password/*` paths, `GET /v1/auth/me`)
- Frontend auth: access token in memory only; opaque refresh token in localStorage; silent refresh ~60s before expiry with single-flight rotation (`src/lib/auth-tokens.ts`)
- Every frontend API call carries a fresh `X-Correlation-ID` via `setDefaultHeadersGetter` in `@workspace/api-client-react`
- Self-registered users start as `PENDING` (login is allowed in PENDING; full activation is an admin action)
- `@workspace/ui` components import `buttonVariants`/`badgeVariants` from `lib/variants.ts` (no JSX) so vitest can test them without a React devDependency
- Never import `zod` v4 directly as a package dependency; use the `zod/v4` subpath from the workspace-pinned v3.x to avoid pnpm hoisting poisoning v3 consumers
- After codegen (`pnpm --filter @workspace/api-spec run codegen`), check `lib/api-client-react/src/index.ts` for duplicate `export *` lines — Orval appends them; remove duplicates and rebuild with `tsc -b` in that directory

## Product

**Module 1 — Identity & Access (complete, validated 2026-08-15; see `docs/module-1-completion-report.md`):**

- Self-registration (CUSTOMER/PENDING), login with JWT access + rotating opaque refresh tokens, logout, `GET /me`
- Password change and password reset (email delivery via Resend, non-enumerating 202)
- Account lockout after 5 failed logins (15 min), per-IP login rate limiting (429 + Retry-After)
- Role-based access control (CUSTOMER, ADMIN_OFFICER, SUPER_ADMIN); customers blocked from admin routes
- Admin user directory (search/filter/paginate) with status management (activate/suspend/deactivate) — web UI at `/admin/users`
- Full audit trail for every security event; consistent error contract `{ statusCode, message, error, correlationId }` with field-level 422 details

**Module 2 — Wallet & Charging (built):** prepaid kobo-denominated wallet, top-ups, transaction history, charging stations, race-safe session start/stop, dashboard; web + Expo mobile clients.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Keep `@types/react` on a single version workspace-wide (catalog pinned to `~19.1.10` to match the mobile app's Expo pin). Two versions poison the pnpm hidden-hoist fallback and break typecheck in unrelated packages.
- The api-server pins `jest-environment-node@^30` locally because react-native (mobile) hoists jest 29 pieces that otherwise get resolved by jest 30's runtime.
- Vite configs (web, mockup-sandbox) require `PORT`/`BASE_PATH` only when serving; `vite build` runs without them.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
