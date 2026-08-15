# Module 1 Completion Report — Enterprise Foundation, Identity & Access Management

> Validation date: 2026-08-15 · Validated against the running dev server and the full automated test suite.

## Summary

Module 1 is **complete and accepted**. All acceptance criteria pass. Three residual gaps were found during this validation pass and fixed (see "Fixes applied during validation").

## Build & typecheck

| Check | Result |
| --- | --- |
| `pnpm run typecheck` (all packages, libs, artifacts) | ✅ PASS — zero errors |
| `pnpm run build` (all packages incl. api-server, web, mockup-sandbox) | ✅ PASS |
| Prettier format check on touched files | ✅ PASS |

## Test suite

| Suite | Result |
| --- | --- |
| Auth/identity integration tests | ✅ PASS |
| Security regression tests (`src/security/security.integration.spec.ts`) | ✅ PASS |
| Charging/wallet integration tests | ✅ PASS |
| **Total** | **65/65 tests, 3/3 suites pass** (`pnpm test:ci`, `--runInBand`) |

CI (`.github/workflows/ci.yml`) runs install → codegen → typecheck (libs, packages, api-server, web) → lint → API build → security audit → Prisma schema validation → integration tests against Postgres 16. The same commands were executed locally and pass.

## Functional acceptance — verified against the running app

| Capability | Result | Evidence |
| --- | --- | --- |
| Register → CUSTOMER/PENDING account | ✅ | 201 with profile; `USER_REGISTERED` audit row |
| Login → user + access/refresh tokens | ✅ | `AuthTokens` shape per contract; `USER_LOGIN_SUCCESS` audit row |
| `GET /v1/auth/me` with Bearer token | ✅ | Returns profile |
| Refresh rotation | ✅ | New refresh token issued; old token reuse → 401; `USER_TOKEN_REFRESHED` + `USER_TOKEN_THEFT_DETECTED` audit rows |
| Logout | ✅ | 204; `USER_LOGOUT` audit row |
| Password change | ✅ | 204; sessions revoked; `USER_PASSWORD_CHANGED` audit row |
| Password reset request | ✅ | 202 (non-enumerating); `USER_PASSWORD_RESET_REQUESTED` audit row. Real email delivery via Resend (`RESEND_API_KEY` configured) — production-domain delivery is tracked as its own task |
| Account lockout after 5 failures | ✅ | 6th attempt with the correct password → 403 "Account is temporarily locked. Try again in 15 minute(s)."; `USER_LOGIN_FAILED` ×5 + `USER_LOGIN_ACCOUNT_LOCKED` audit rows |
| Login rate limiting | ✅ | 429 with `Retry-After: 900` after per-IP window exhausted |
| RBAC: CUSTOMER blocked from admin routes | ✅ | `GET /v1/users` with customer token → 403 |
| Admin login → user directory → activate PENDING customer | ✅ | SUPER_ADMIN (seeded via idempotent `seed:admin`) listed PENDING users and PATCHed status to ACTIVE (200); `ADMIN_USERS_LISTED` + `USER_STATUS_CHANGED` audit rows |

## API contract

- `lib/api-spec/openapi.yaml` matches the implemented endpoints (route table confirmed from NestJS boot log: health, system, auth ×8, users ×3, plus Module 2 wallet/charging/dashboard).
- Regenerated client (`pnpm --filter @workspace/api-spec run codegen`) produced **no drift** in generated code (only the known Orval index-append artifacts, reverted per standing procedure).
- All error responses follow `{ statusCode, message, error, correlationId }`; validation errors add a `details: [{ field, message }]` array.

## Security checklist (docs/security/security-smoke-test-runbook.md)

| Check | Result |
| --- | --- |
| Helmet headers (CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS) | ✅ PASS |
| X-Correlation-ID generated and echoed | ✅ PASS |
| 404/401 bodies contain no stack traces / internals | ✅ PASS |
| Validation → 422 with field-level `details` | ✅ PASS (field names now populated — see fixes) |
| Duplicate email → 409 | ✅ PASS |
| Rate limit → 429 + `Retry-After` | ✅ PASS |
| Audit rows for auth events | ✅ PASS (register, login success/failure, lockout, refresh, theft detection, logout, password change/reset, admin actions) |
| No secrets in logs (`authorization: "[Redacted]"` in pino output) | ✅ PASS — confirmed in live server logs |

## Fixes applied during validation

1. **`@types/react` split (19.1 vs 19.2)** — the mobile app's Expo pin (`~19.1.10`) coexisted with the catalog's `^19.2.0`, so the pnpm hidden-hoist fallback served 19.1 typings to packages resolving their optional React peer (react-day-picker, lucide-react), breaking `pnpm run typecheck` in mockup-sandbox. Fixed by aligning the workspace catalog to `~19.1.10`.
2. **Vite configs required `PORT`/`BASE_PATH` for `vite build`** — web and mockup-sandbox builds failed outside the workflow environment (and would fail in CI). Both configs now only require those env vars when serving; builds default to `/`.
3. **Jest 30/29 mix** — react-native (mobile) hoists jest 29 pieces; the api-server's jest 30 runtime resolved a jest 29 `jest-environment-node`, crashing every suite with `clearMocksOnScope is not a function`. Fixed by pinning `jest-environment-node@^30.4.0` in the api-server.
4. **Validation details had `field: "unknown"`** — the global `ValidationPipe` flattened class-validator errors to strings before the exception filter could map them. Added an `exceptionFactory` that preserves `ValidationError[]` (mirrored in the test app factory), so 422 responses now carry real field names.

## Placeholder / TODO scan

No `TODO`/`FIXME`/placeholder markers remain in Module 1 scope (`auth`, `identity`, `audit` modules).

## Known risks

- **Password reset delivery in production** — reset emails send via Resend; sandbox/dev delivery verified, production-domain deliverability is covered by a dedicated follow-on task.
- **Test process force-exit** — jest completes but relies on `forceExit`-style teardown; tracked as its own task.
- **`pnpm audit`** — remaining high-severity findings are devDependency-only (documented in `docs/security/cve-triage.md`); CI step is intentionally `continue-on-error`.
- **CI runs on GitHub** — local execution of every CI command passes; actual Actions runs occur on push to `main`/`develop`.
