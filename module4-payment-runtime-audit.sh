#!/usr/bin/env bash

LOG="$HOME/workspace/module4-payment-runtime-audit.log"
: > "$LOG"

{
  echo "=================================================="
  echo "MODULE 4 — PAYMENT RUNTIME AUDIT"
  echo "Started: $(date)"
  echo "=================================================="

  echo
  echo "===== PAYMENT ROUTES ====="
  grep -Rni \
    -E '@Controller|@Post|payments|initiate|complete' \
    artifacts/api-server/src/modules/payment \
    --include="*.ts" || true

  echo
  echo "===== PAYMENT SERVICE ====="
  sed -n '1,240p' \
    artifacts/api-server/src/modules/payment/payment.service.ts

  echo
  echo "===== PAYMENT CONTROLLER ====="
  sed -n '1,180p' \
    artifacts/api-server/src/modules/payment/payment.controller.ts

  echo
  echo "===== PAYMENT MODULE ====="
  cat artifacts/api-server/src/modules/payment/payment.module.ts

  echo
  echo "===== PAYMENT AUDIT ACTIONS ====="
  cat artifacts/api-server/src/modules/payment/audit-actions.ts

  echo
  echo "===== PAYMENT TABLE COUNT ====="
  pnpm --filter ./artifacts/api-server exec prisma db execute --stdin <<'SQL'
SELECT COUNT(*) AS payment_count
FROM payments;
SQL

  echo
  echo "===== PAYMENT STATUS COUNTS ====="
  pnpm --filter ./artifacts/api-server exec prisma db execute --stdin <<'SQL'
SELECT status, COUNT(*) AS count
FROM payments
GROUP BY status
ORDER BY status;
SQL

  echo
  echo "===== WALLET TRANSACTION COUNTS ====="
  pnpm --filter ./artifacts/api-server exec prisma db execute --stdin <<'SQL'
SELECT type, status, COUNT(*) AS count
FROM wallet_transactions
GROUP BY type, status
ORDER BY type, status;
SQL

  echo
  echo "===== FINAL TYPECHECK ====="
  pnpm --filter ./artifacts/api-server typecheck

  echo
  echo "=================================================="
  echo "PAYMENT RUNTIME AUDIT FINISHED"
  echo "Finished: $(date)"
  echo "=================================================="

} > "$LOG" 2>&1

STATUS=$?

echo
echo "=================================================="
if [ "$STATUS" -eq 0 ]; then
  echo "MODULE 4 PAYMENT RUNTIME AUDIT: SUCCESS"
else
  echo "MODULE 4 PAYMENT RUNTIME AUDIT: FAILED"
  echo "Exit code: $STATUS"
fi
echo "=================================================="
echo
echo "FULL LOG:"
echo "$LOG"
echo
echo "SAFE SUMMARY:"
grep -n -E \
  "ERROR|error|FAILED|SUCCESS|payments|payment_count|status|PAYMENT|typecheck" \
  "$LOG" | tail -80

exit "$STATUS"
