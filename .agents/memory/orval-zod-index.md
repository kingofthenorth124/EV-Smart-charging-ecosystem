---
name: Orval zod workspace index overwrite
description: Codegen appends a types re-export to lib/api-zod/src/index.ts that breaks typecheck
---

Running `pnpm --filter @workspace/api-spec run codegen` makes orval append
`export * from './generated/types';` to `lib/api-zod/src/index.ts`. Combined with
`export * from './generated/api';`, this fails typecheck with TS2308 (e.g.
`LoginResponse` exported as both a zod const and an interface).

**Why:** orval's workspace mode rewrites the package index; the project intentionally
exports only `./generated/api` from api-zod.

**How to apply:** after each codegen run, `git checkout lib/api-zod/src/index.ts`
(or otherwise ensure it exports only `./generated/api`) before running typecheck.
