#!/usr/bin/env bash

LOG="$HOME/workspace/module4-fix-prisma-client.log"
: > "$LOG"

{
  echo "=================================================="
  echo "MODULE 4 — FIX / VERIFY PRISMA CLIENT"
  echo "Started: $(date)"
  echo "=================================================="

  echo
  echo "===== PRISMA GENERATE ====="
  pnpm --filter ./artifacts/api-server exec prisma generate

  echo
  echo "===== NODE PAYMENT DELEGATE CHECK ====="
  node <<'NODE'
const { PrismaClient } = require(
  "./artifacts/api-server/node_modules/@prisma/client"
);

const prisma = new PrismaClient();

console.log("typeof prisma.payment =", typeof prisma.payment);

if (typeof prisma.payment !== "object") {
  console.error("ERROR: prisma.payment is missing");
  process.exit(1);
}

console.log("PASS: prisma.payment exists");

prisma.$disconnect();
NODE

  echo
  echo "===== TYPESCRIPT TYPECHECK ====="
  pnpm --filter ./artifacts/api-server typecheck

  echo
  echo "===== FINAL STATUS ====="
  echo "MODULE 4 PRISMA CLIENT CHECK FINISHED"
  echo "Finished: $(date)"

} > "$LOG" 2>&1

STATUS=$?

echo
echo "=================================================="
if [ "$STATUS" -eq 0 ]; then
  echo "MODULE 4 PRISMA CLIENT CHECK: SUCCESS"
else
  echo "MODULE 4 PRISMA CLIENT CHECK: FAILED"
  echo "Exit code: $STATUS"
fi
echo "=================================================="
echo
echo "FULL LOG:"
echo "$LOG"
echo
echo "To inspect the last 30 lines:"
echo "tail -30 $LOG"

exit "$STATUS"
