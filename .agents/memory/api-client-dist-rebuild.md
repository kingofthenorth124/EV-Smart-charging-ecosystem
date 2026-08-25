---
name: api-client-react dist rebuild
description: When to rebuild the lib/api-client-react dist/ and how, to keep the web app typecheck working after codegen updates.
---

The web app's tsconfig.json uses `references` pointing to `lib/api-client-react` (a composite project). TypeScript resolves that package from its built `dist/` — NOT from source. When `pnpm --filter @workspace/api-spec run codegen` runs, it rewrites `lib/api-client-react/src/generated/api.ts` and then appends duplicate `export *` lines to `lib/api-client-react/src/index.ts`. Both of those changes require a rebuild.

**Why:** The dist/index.d.ts is stale until rebuilt; new hooks added by codegen are invisible to the web app typecheck, causing TS2305 "no exported member" errors for every new hook.

**How to apply:** After any codegen run:

1. Check `lib/api-client-react/src/index.ts` for duplicate `export * from './generated/api'` and `export * from './generated/api.schemas'` lines — Orval appends them; remove the duplicates.
2. Rebuild the dist: `cd lib/api-client-react && npx tsc -b tsconfig.json`
3. Now `pnpm --filter @workspace/web typecheck` will see the updated hooks.
