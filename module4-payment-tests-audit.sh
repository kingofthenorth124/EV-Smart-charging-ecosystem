#!/usr/bin/env bash

LOG="$HOME/workspace/module4-payment-tests-audit.log"
: > "$LOG"

{
  echo "=================================================="
  echo "MODULE 4 — PAYMENT TEST AUDIT"
  echo "Started: $(date)"
  echo "=================================================="

  echo
  echo "===== PAYMENT TEST FILES ====="
  find artifacts/api-server/src \
    -type f \
    \( -name "*.spec.ts" -o -name "*.test.ts" \) \
    | sort

  echo
  echo "===== PAYMENT REFERENCES ====="
  grep -Rni \
    -E "PaymentService|payments|providerReference|PAYMENT_COMPLETED|PaymentCreated|PaymentCompleted" \
    artifacts/api-server/src \
    --include="*.spec.ts" \
    --include="*.test.ts" \
    || true

  echo
  echo "===== PAYMENT SERVICE ====="
  sed -n '1,260p' \
    artifacts/api-server/src/modules/payment/payment.service.ts

  echo
  echo "===== PAYMENT CONTROLLER ====="
  sed -n '1,220p' \
    artifacts/api-server/src/modules/payment/payment.controller.ts

  echo
  echo "===== PAYMENT MODULE ====="
  cat artifacts/api-server/src/modules/payment/payment.module.ts

  echo
  echo "===== APP MODULE PAYMENT REGISTRATION ====="
  grep -n -A5 -B5 "PaymentModule" \
    artifacts/api-server/src/app.module.ts \
    || true

  echo
  echo "===== PAYMENT DTO ====="
  cat artifacts/api-server/src/modules/payment/dto/initiate-payment.dto.ts

  echo
  echo "===== PAYMENT RESPONSE DTO ====="
  cat artifacts/api-server/src/modules/payment/dto/payment-response.dto.ts

  echo
  echo "===== PAYMENT AUDIT ACTIONS ====="
  cat artifacts/api-server/src/modules/payment/audit-actions.ts

  echo
  echo "===== CURRENT TYPECHECK ====="
  pnpm run typecheck

  echo
  echo "=================================================="
  echo "PAYMENT TEST AUDIT COMPLETE"
  echo "Finished: $(date)"
  echo "=================================================="

} > "$LOG" 2>&1

EXIT_CODE=$?

echo "=============================================="
if [ "$EXIT_CODE" -eq 0 ]; then
  echo "MODULE 4 PAYMENT AUDIT: SUCCESS"
else
  echo "MODULE 4 PAYMENT AUDIT: FAILED"
fi
echo "=============================================="
echo
echo "Full log:"
echo "$LOG"

exit "$EXIT_CODE"
