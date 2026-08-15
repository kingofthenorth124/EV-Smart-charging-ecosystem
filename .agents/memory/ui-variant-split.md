---
name: UI package variant split
description: Why buttonVariants/badgeVariants live in packages/ui/src/lib/variants.ts rather than in their component files, and the rule for future variants.
---

The `cva()` variant functions (`buttonVariants`, `badgeVariants`) are defined in `packages/ui/src/lib/variants.ts` — a pure TypeScript file with no JSX and no React import. The component files (`button.tsx`, `badge.tsx`) import from there.

**Why:** Vitest running in `node` environment cannot resolve `react/jsx-dev-runtime` when it encounters a `.tsx` file that contains JSX. Even a dynamic `import()` of such a file fails at transform time. Since packages/ui does not add React as a devDependency (it's a peer), the only way to unit-test the variant outputs without spinning up a full React test environment is to keep the variant logic in a non-JSX module.

**How to apply:** Any new component with a `cva()` variant function should define that function in `packages/ui/src/lib/variants.ts` and import it into the `.tsx` component file. Component rendering tests (snapshot, interaction) belong in the consuming app's own test suite, not in packages/ui.
