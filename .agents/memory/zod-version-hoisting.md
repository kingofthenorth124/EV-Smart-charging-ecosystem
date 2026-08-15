---
name: Zod version hoisting hazard
description: Why no workspace package may depend on zod v4 directly
---

Rule: keep every workspace package on the catalog zod (v3.25.x). When code needs the zod v4 API (e.g. orval's generated zod output), import from the `zod/v4` subpath that zod 3.25+ ships — never add a `zod@^4` dependency anywhere in the workspace.

**Why:** if any package depends on zod v4, pnpm's hidden hoist can point the shared `zod` resolution at v4, and type-level consumers of v3 (e.g. `@hookform/resolvers/zod`) start typechecking against v4 typings and fail — even though the app itself installed v3.

**How to apply:** the API codegen script already rewrites generated imports to `zod/v4`; keep that step. If v4-typing errors appear after dependency changes, suspect the hoisted zod version and stale incremental-tsc caches.
