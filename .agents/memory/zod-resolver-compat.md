---
name: Zod resolver compatibility
description: Why @workspace/validation must use zod (v3), not zod/v4, and how form schemas are composed.
---

## Rule
`packages/validation` imports from `'zod'` (v3), NOT `'zod/v4'`.

**Why:** `@hookform/resolvers@3.x zodResolver` detects errors via `Array.isArray(error?.errors)` (Zod v3 format). Zod v4 schemas throw errors with `.issues` instead of `.errors`, so the resolver sees no field errors and silently produces an empty error object — the form appears valid even when it isn't.

**How to apply:**
- Never change the import in `packages/validation/src/index.ts` to `zod/v4`.
- Use `z.string({ required_error: 'msg' })` (v3 API), NOT `z.string({ error: 'msg' })` (v4 API).
- Lowercase transform: `emailSchema` uses `.transform(s => s.toLowerCase())` instead of v4's `.toLowerCase()`.

## Form schema composition pattern
For forms that match a shared schema exactly (e.g. login, forgot-password):
- Import and use the schema directly from `@workspace/validation`.

For forms that need UI-only fields (e.g. `confirmPassword`):
- Call `.extend({ confirmPassword: z.string() })` on the shared ZodObject, then `.refine()`.
- This works because `ZodObject.extend()` accepts any `ZodTypeAny` fields (including `ZodEffects` from transforms).
- Schemas with `.refine()` already applied (like `changePasswordSchema`) return `ZodEffects` which does NOT have `.extend()`. For those, import the shared primitive (e.g. `passwordSchema`) and compose a fresh `z.object()` locally.

## ZodEffects in objects
`emailSchema` is `ZodEffects<ZodString, string>` due to `.transform()`.
`z.infer<typeof registerSchema>` still gives `{ email: string; ... }` — the OUTPUT type is correct.
`ZodObject.extend()` on an object containing `ZodEffects` fields works fine in Zod v3.
