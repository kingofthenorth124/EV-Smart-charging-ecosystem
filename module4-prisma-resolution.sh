#!/usr/bin/env bash

LOG="$HOME/workspace/module4-prisma-resolution.log"
: > "$LOG"

{
  echo "=================================================="
  echo "MODULE 4 — PRISMA TYPE RESOLUTION DIAGNOSTIC"
  echo "Started: $(date)"
  echo "=================================================="

  echo
  echo "===== 1. PRISMA GENERATE ====="
  pnpm --filter ./artifacts/api-server exec prisma generate

  echo
  echo "===== 2. CLIENT PACKAGE LOCATION ====="
  readlink -f artifacts/api-server/node_modules/@prisma/client || true

  echo
  echo "===== 3. PRISMA GENERATED CLIENT LOCATION ====="
  readlink -f artifacts/api-server/node_modules/.prisma/client || true

  echo
  echo "===== 4. PAYMENT IN GENERATED TYPES ====="
  grep -Rni \
    "payment" \
    artifacts/api-server/node_modules/.prisma/client/index.d.ts \
    2>/dev/null | head -30 || true

  echo
  echo "===== 5. PAYMENT IN PRISMA CLIENT TYPES ====="
  grep -Rni \
    "PaymentDelegate\|PaymentGetPayload\|PaymentStatus" \
    artifacts/api-server/node_modules/@prisma/client \
    2>/dev/null | head -30 || true

  echo
  echo "===== 6. ALL PRISMA CLIENT COPIES ====="
  find . \
    -path '*/node_modules/.prisma/client/index.d.ts' \
    -o -path '*/node_modules/@prisma/client/index.d.ts' \
    2>/dev/null \
    | sort

  echo
  echo "===== 7. TYPESCRIPT CONFIG ====="
  cat artifacts/api-server/tsconfig.json

  echo
  echo "===== 8. PRISMA PACKAGE VERSIONS ====="
  pnpm --filter ./artifacts/api-server list \
    @prisma/client prisma \
    --depth 0

  echo
  echo "===== 9. TYPESCRIPT RESOLUTION ====="
  cd artifacts/api-server
  pnpm exec tsc \
    --noEmit \
    --traceResolution \
    2>&1 | grep -E \
    "(@prisma/client|\\.prisma/client|payment|PrismaService)" \
    | head -150 || true

  echo
  echo "=================================================="
  echo "DIAGNOSTIC FINISHED"
  echo "Finished: $(date)"
  echo "=================================================="

} > "$LOG" 2>&1

echo
echo "=================================================="
echo "PRISMA TYPE RESOLUTION DIAGNOSTIC SAVED"
echo "=================================================="
echo "$LOG"
echo
echo "SAFE SUMMARY:"
grep -n -E \
  "PaymentDelegate|PaymentStatus|payment|@prisma/client|\\.prisma/client|version|error TS" \
  "$LOG" | tail -100
