#!/usr/bin/env bash

LOG="$HOME/workspace/module4-final-verification.log"
: > "$LOG"

{
  echo "=================================================="
  echo "MODULE 4 — FINAL VERIFICATION"
  echo "Started: $(date)"
  echo "=================================================="

  echo
  echo "===== GIT STATUS ====="
  git status --short

  echo
  echo "===== MIGRATION STATUS ====="
  pnpm --filter ./artifacts/api-server exec prisma migrate status

  echo
  echo "===== SCHEMA VALIDATION ====="
  pnpm --filter ./artifacts/api-server exec prisma validate

  echo
  echo "===== API SERVER TYPECHECK ====="
  pnpm --filter ./artifacts/api-server typecheck

  echo
  echo "===== PAYMENT TABLE ====="
  pnpm --filter ./artifacts/api-server exec prisma db execute --stdin <<'SQL'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'payments';
SQL

  echo
  echo "===== PAYMENT COLUMNS ====="
  pnpm --filter ./artifacts/api-server exec prisma db execute --stdin <<'SQL'
SELECT ordinal_position, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payments'
ORDER BY ordinal_position;
SQL

  echo
  echo "===== PAYMENT MIGRATION ====="
  find prisma/migrations \
    -maxdepth 2 \
    -type f \
    -path '*module4_payment/migration.sql' \
    -print

  echo
  echo "=================================================="
  echo "MODULE 4 FINAL VERIFICATION FINISHED"
  echo "Finished: $(date)"
  echo "=================================================="

} > "$LOG" 2>&1

STATUS=$?

echo
echo "=================================================="
if [ "$STATUS" -eq 0 ]; then
  echo "MODULE 4 FINAL VERIFICATION: SUCCESS"
else
  echo "MODULE 4 FINAL VERIFICATION: FAILED"
  echo "Exit code: $STATUS"
fi
echo "=================================================="
echo
echo "FULL LOG:"
echo "$LOG"
echo
echo "To inspect safely:"
echo "grep -n -E 'ERROR|error|FAILED|SUCCESS|Payment|payment|migrations|payments' $LOG"

exit "$STATUS"
