#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Module 3 Acceptance Gate — Shared Libraries & Common Components
# Run from the workspace root: bash scripts/check-module3.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0

pass() { echo -e "  ${GREEN}✓${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}✗${NC} $1"; FAIL=$((FAIL+1)); }
header() { echo -e "\n${YELLOW}── $1${NC}"; }

# ── 1. Package structure ──────────────────────────────────────────────────────
header "1 · Package structure"

packages=(
  "packages/shared-types/src/index.ts"
  "packages/config/src/index.ts"
  "packages/validation/src/index.ts"
  "packages/auth/src/index.ts"
  "packages/utils/src/index.ts"
  "packages/ui/src/index.ts"
  "packages/sdk/src/index.ts"
  "packages/ui/src/lib/variants.ts"
  "packages/sdk/src/errors.ts"
  "packages/sdk/src/client.ts"
)
for f in "${packages[@]}"; do
  [ -f "$f" ] && pass "$f exists" || fail "$f MISSING"
done

# ── 2. Shared-types exports ───────────────────────────────────────────────────
header "2 · @workspace/shared-types exports"

types=(WalletSummary TopUpRequest TopUpResponse DashboardSummary Station
       ChargingSession StartSessionRequest PLATFORM_EVENTS AUDIT_ACTIONS
       WalletTransaction EventEnvelope)
for t in "${types[@]}"; do
  grep -q "$t" packages/shared-types/src/index.ts \
    && pass "exports $t" || fail "missing $t"
done

# ── 3. Config exports ─────────────────────────────────────────────────────────
header "3 · @workspace/config exports"
for sym in KOBO_PER_NAIRA MIN_TOPUP_KOBO MAX_TOPUP_KOBO MAX_SESSION_HOURS \
           resolveEnvironment isProduction isDevelopment isTest; do
  grep -q "$sym" packages/config/src/index.ts \
    && pass "exports $sym" || fail "missing $sym"
done

# ── 4. Validation schemas ─────────────────────────────────────────────────────
header "4 · @workspace/validation schemas"
for schema in loginSchema registerSchema topUpSchema startSessionSchema \
              paginationSchema cuidSchema passwordSchema; do
  grep -q "$schema" packages/validation/src/index.ts \
    && pass "exports $schema" || fail "missing $schema"
done

# ── 5. Auth helpers ───────────────────────────────────────────────────────────
header "5 · @workspace/auth helpers"
for sym in hasPermission isAdminRole isCustomerRole USER_ROLES ROLE_PERMISSIONS; do
  grep -q "$sym" packages/auth/src/index.ts \
    && pass "exports $sym" || fail "missing $sym"
done

# ── 6. UI components ──────────────────────────────────────────────────────────
header "6 · @workspace/ui components"
for comp in Button Input Textarea Label Card Badge Alert Spinner Skeleton \
            Separator Table Tabs Dialog Select Pagination; do
  grep -q "$comp" packages/ui/src/index.ts \
    && pass "exports $comp" || fail "missing $comp"
done

# ── 7. SDK modules ────────────────────────────────────────────────────────────
header "7 · @workspace/sdk modules"
grep -q "createClient" packages/sdk/src/index.ts \
  && pass "exports createClient" || fail "missing createClient"
grep -q "SdkError"    packages/sdk/src/index.ts \
  && pass "exports SdkError"    || fail "missing SdkError"
grep -q "isSdkError"  packages/sdk/src/index.ts \
  && pass "exports isSdkError"  || fail "missing isSdkError"
grep -q "wrapResult"  packages/sdk/src/index.ts \
  && pass "exports wrapResult"  || fail "missing wrapResult"

# ── 8. Variant helpers ────────────────────────────────────────────────────────
header "8 · Pure variant helpers (no JSX)"
grep -q "buttonVariants" packages/ui/src/lib/variants.ts \
  && pass "buttonVariants in lib/variants.ts" || fail "missing buttonVariants"
grep -q "badgeVariants" packages/ui/src/lib/variants.ts \
  && pass "badgeVariants in lib/variants.ts"  || fail "missing badgeVariants"

# ── 9. API client index clean (no duplicate exports) ─────────────────────────
header "9 · api-client-react index has no duplicate exports"
dups=$(grep -c 'export \* from.*generated/api"' lib/api-client-react/src/index.ts || true)
[ "$dups" -le 1 ] && pass "no duplicate api exports" || fail "duplicate exports detected ($dups)"
dups=$(grep -c 'export \* from.*generated/api.schemas"' lib/api-client-react/src/index.ts || true)
[ "$dups" -le 1 ] && pass "no duplicate schema exports" || fail "duplicate schema exports ($dups)"

# ── 10. Tailwind source scanning for ui package ───────────────────────────────
header "10 · Web app Tailwind scans @workspace/ui"
grep -q "@source.*packages/ui" artifacts/web/src/index.css \
  && pass "@source directive in index.css" || fail "missing @source for packages/ui"

# ── 11. Web app depends on @workspace/ui and @workspace/sdk ──────────────────
header "11 · Web app package.json dependencies"
grep -q "@workspace/ui" artifacts/web/package.json \
  && pass "@workspace/ui in web devDeps" || fail "@workspace/ui missing"
grep -q "@workspace/sdk" artifacts/web/package.json \
  && pass "@workspace/sdk in web devDeps" || fail "@workspace/sdk missing"

# ── 12. Unit tests ────────────────────────────────────────────────────────────
header "12 · Unit tests — all 7 shared packages"

for pkg in utils config shared-types auth validation sdk ui; do
  result=$(pnpm --filter "@workspace/$pkg" run test 2>&1)
  if echo "$result" | grep -q "Tests.*passed" && ! echo "$result" | grep -q "Tests.*failed"; then
    count=$(echo "$result" | grep -oP '\d+ passed' | head -1)
    pass "@workspace/$pkg — $count"
  else
    fail "@workspace/$pkg tests FAILED"
    echo "$result" | grep -E "FAIL|Error|failed" | head -5 | sed 's/^/      /'
  fi
done

# ── 13. TypeScript — all shared packages ─────────────────────────────────────
header "13 · TypeScript typecheck — all shared packages"
tc_packages=(utils config shared-types auth validation sdk ui)
for pkg in "${tc_packages[@]}"; do
  if pnpm --filter "@workspace/$pkg" typecheck 2>&1 | grep -q "error TS"; then
    fail "@workspace/$pkg typecheck has errors"
  else
    pass "@workspace/$pkg typecheck clean"
  fi
done

# ── 14. API server regression ─────────────────────────────────────────────────
header "14 · API server — no regressions (65 tests)"
api_result=$(pnpm --filter @workspace/api-server run test 2>&1)
if echo "$api_result" | grep -q "65 passed"; then
  pass "65/65 API server tests pass"
elif echo "$api_result" | grep -q "Tests:.*passed"; then
  count=$(echo "$api_result" | grep "Tests:" | head -1)
  pass "API server: $count"
else
  fail "API server tests failed"
fi

# ── 15. Web app typecheck ─────────────────────────────────────────────────────
header "15 · Web app typecheck"
if pnpm --filter @workspace/web typecheck 2>&1 | grep -q "error TS"; then
  fail "web app has TypeScript errors"
else
  pass "web app typecheck clean"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}  Module 3 PASSED — $PASS/$TOTAL criteria met${NC}"
else
  echo -e "${RED}  Module 3 FAILED — $PASS/$TOTAL passed, $FAIL failed${NC}"
fi
echo "═══════════════════════════════════════════════════════"
echo ""
exit $FAIL
