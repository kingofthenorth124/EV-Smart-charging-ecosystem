/**
 * @workspace/ui — unit tests
 *
 * We test the pure-JS portions of the package (cn utility, variant helpers
 * from lib/variants.ts — no JSX, no React dependency needed in test env).
 * Component type-correctness is enforced by TypeScript (tsc --noEmit).
 * End-to-end rendering tests live in the web app's own test suite.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { cn } from "../lib/utils";
import { buttonVariants, badgeVariants } from "../lib/variants";

// ─── cn (class merger) ────────────────────────────────────────────────────────

describe("cn (class merger)", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts — last one wins", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "skipped", "added")).toBe("base added");
  });

  it("filters falsy values", () => {
    expect(cn(undefined, null, "", "visible")).toBe("visible");
  });

  it("merges padding — p-4 + px-2 both present", () => {
    const result = cn("p-4", "px-2");
    // tailwind-merge removes the redundant p-4 axis when px-2 overrides it
    expect(result).toContain("px-2");
  });

  it("deduplicates identical classes", () => {
    expect(cn("flex", "flex")).toBe("flex");
  });
});

// ─── buttonVariants ───────────────────────────────────────────────────────────

describe("buttonVariants", () => {
  it("is a function", () => {
    expect(typeof buttonVariants).toBe("function");
  });

  it("default variant contains primary classes", () => {
    const cls = buttonVariants({ variant: "default" });
    expect(cls).toContain("bg-primary");
    expect(cls).toContain("text-primary-foreground");
  });

  it("destructive variant contains destructive classes", () => {
    const cls = buttonVariants({ variant: "destructive" });
    expect(cls).toContain("bg-destructive");
  });

  it("ghost variant has transparent border", () => {
    const cls = buttonVariants({ variant: "ghost" });
    expect(cls).toContain("border-transparent");
  });

  it("link variant has underline offset", () => {
    const cls = buttonVariants({ variant: "link" });
    expect(cls).toContain("underline-offset-4");
  });

  it("icon size produces square dimensions", () => {
    const cls = buttonVariants({ size: "icon" });
    expect(cls).toContain("h-9");
    expect(cls).toContain("w-9");
  });

  it("sm size has reduced padding", () => {
    const cls = buttonVariants({ size: "sm" });
    expect(cls).toContain("px-3");
  });

  it("lg size has wider padding", () => {
    const cls = buttonVariants({ size: "lg" });
    expect(cls).toContain("px-8");
  });

  it("produces a stable class string for the same input", () => {
    const a = buttonVariants({ variant: "default", size: "default" });
    const b = buttonVariants({ variant: "default", size: "default" });
    expect(a).toBe(b);
  });

  it("includes base focus-visible ring class", () => {
    const cls = buttonVariants({});
    expect(cls).toContain("focus-visible:ring-1");
  });
});

// ─── badgeVariants ────────────────────────────────────────────────────────────

describe("badgeVariants", () => {
  it("is a function", () => {
    expect(typeof badgeVariants).toBe("function");
  });

  it("default variant contains primary background", () => {
    const cls = badgeVariants({ variant: "default" });
    expect(cls).toContain("bg-primary");
  });

  it("destructive variant contains destructive background", () => {
    const cls = badgeVariants({ variant: "destructive" });
    expect(cls).toContain("bg-destructive");
  });

  it("outline variant contains text-foreground", () => {
    const cls = badgeVariants({ variant: "outline" });
    expect(cls).toContain("text-foreground");
  });

  it("success variant contains green classes", () => {
    const cls = badgeVariants({ variant: "success" });
    expect(cls).toContain("bg-green-100");
    expect(cls).toContain("text-green-800");
  });

  it("warning variant contains amber classes", () => {
    const cls = badgeVariants({ variant: "warning" });
    expect(cls).toContain("bg-amber-100");
    expect(cls).toContain("text-amber-800");
  });

  it("produces stable output", () => {
    const a = badgeVariants({ variant: "secondary" });
    const b = badgeVariants({ variant: "secondary" });
    expect(a).toBe(b);
  });
});
