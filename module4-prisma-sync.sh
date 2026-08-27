#!/usr/bin/env bash

LOG="$HOME/workspace/module4-prisma-sync.log"

# Start a fresh log
: > "$LOG"

{
  echo "=================================================="
  echo "MODULE 4 — PRISMA CLIENT SYNC"
  echo "Started: $(date)"
  echo "=================================================="

  echo
  echo "===== PRISMA GENERATE ====="
  pnpm --filter ./artifacts/api-server exec prisma generate

  echo
  echo "===== VERIFY PAYMENT DELEGATE ====="
  node - <<'NODE'
const { PrismaClient } = require("./artifacts/api-server/node_modules/@prisma/client");

const prisma = new PrismaClient();

console.log("typeof prisma.payment =", typeof prisma.payment);

if (typeof prisma.payment !== "object") {
  console.error("ERROR: Payment delegate is missing");
  process.exit(1);
}

console.log("Payment delegate exists.");
await prisma.$disconnect();
NODE

  echo
  echo "===== TYPESCRIPT CHECK ====="
  pnpm run typecheck

  echo
  echo "===== MIGRATION STATUS ====="
  pnpm --filter ./artifacts/api-server exec prisma migrate status

  echo
  echo "=================================================="
  echo "ALL CHECKS COMPLETED"
  echo "Finished: $(date)"
  echo "=================================================="

} > "$LOG" 2>&1

EXIT_CODE=$?

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "=============================================="
  echo "MODULE 4 PRISMA SYNC: SUCCESS"
  echo "=============================================="
else
  echo "=============================================="
  echo "MODULE 4 PRISMA SYNC: FAILED"
  echo "=============================================="
fi

echo
echo "FULL LOG:"
echo "$LOG"
echo
echo "The output is permanently saved in:"
echo "~/workspace/module4-prisma-sync.log"

exit "$EXIT_CODE"
