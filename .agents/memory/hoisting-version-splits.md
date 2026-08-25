---
name: pnpm hidden-hoist version splits
description: How duplicate versions of @types/react and jest packages break unrelated workspace members
---

Rule: keep exactly one version of `@types/react` (and jest core packages) across the workspace.

**Why:** pnpm's hidden-hoist fallback (`node_modules/.pnpm/node_modules/`) serves whichever duplicate got hoisted to packages that resolve optional peers (react-day-picker, lucide-react) or runtime lookups (jest resolving `jest-environment-node`). Symptoms seen:

- "Two different types with this name exist, but they are unrelated" (`VoidOrUndefinedOnly`) in typecheck of a package that itself pins the other version.
- `this._moduleMocker.clearMocksOnScope is not a function` when jest 30 runtime loads a hoisted jest 29 environment (react-native pulls jest 29).

**How to apply:** Expo pins `@types/react ~19.1.x`, so the workspace catalog is pinned to match. If a consumer needs a specific jest piece, pin it in that package's own devDependencies (api-server pins `jest-environment-node@^30`). After changing versions, rerun full `pnpm run typecheck` — failures show up in _other_ packages than the one changed.
