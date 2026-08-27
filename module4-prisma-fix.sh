#!/usr/bin/env bash
set -e

echo "===== 1. GENERATOR BLOCK ====="
grep -n -A6 "generator client" artifacts/api-server/prisma/schema.prisma

echo
echo "===== 2. PAYMENT MODEL IN SCHEMA ====="
grep -n -A15 "^model Payment" artifacts/api-server/prisma/schema.prisma || echo "NOT FOUND IN SCHEMA"

echo
echo "===== 3. CURRENT @prisma/client IMPORTS IN src/ ====="
grep -rn "from ['\"]@prisma/client['\"]" artifacts/api-server/src/ || echo "none found"

echo
echo "===== 4. LOOKING FOR A CUSTOM OUTPUT PATH ====="
OUTPUT_LINE=$(grep -n "output" artifacts/api-server/prisma/schema.prisma | grep -v "//" || true)
echo "$OUTPUT_LINE"

if [ -n "$OUTPUT_LINE" ]; then
  OUTPUT_PATH=$(echo "$OUTPUT_LINE" | sed -E 's/.*output\s*=\s*"([^"]+)".*/\1/')
  echo "Detected custom output path: $OUTPUT_PATH"

  echo
  echo "===== 5. CHECKING FOR Payment IN CUSTOM OUTPUT ====="
  RESOLVED=$(cd artifacts/api-server/prisma && realpath "$OUTPUT_PATH" 2>/dev/null || true)
  echo "Resolved to: $RESOLVED"
  if [ -f "$RESOLVED/index.d.ts" ]; then
    grep -c "Payment" "$RESOLVED/index.d.ts" && echo "Payment found in custom output types."
  else
    echo "No index.d.ts at resolved custom output path — run prisma generate first."
  fi

  echo
  echo "===== 6. APPLYING FIX: repointing imports to custom output ====="
  RELATIVE_IMPORT=$(python3 -c "
import os
src = 'artifacts/api-server/src'
target = os.path.normpath(os.path.join('artifacts/api-server/prisma', '$OUTPUT_PATH'))
rel = os.path.relpath(target, src)
print(rel if rel.startswith('.') else './' + rel)
")
  echo "Will repoint imports to: $RELATIVE_IMPORT"

  grep -rl "from ['\"]@prisma/client['\"]" artifacts/api-server/src/ | while read -r f; do
    DEPTH=$(echo "$f" | sed "s|artifacts/api-server/src/||" | tr -cd '/' | wc -c)
    PREFIX=$(printf '../%.0s' $(seq 1 "$DEPTH"))
    sed -i "s|from ['\"]@prisma/client['\"]|from '${PREFIX}${RELATIVE_IMPORT#./}'|g" "$f"
    echo "patched: $f"
  done

else
  echo "No custom output path — legacy prisma-client-js generator. Regenerating clean."
  rm -rf artifacts/api-server/node_modules/.prisma
  find node_modules/.pnpm -maxdepth 1 -name "@prisma+client*" -exec rm -rf {} \; 2>/dev/null || true
  pnpm install
fi

echo
echo "===== 7. REGENERATE PRISMA CLIENT ====="
pnpm --filter ./artifacts/api-server exec prisma generate

echo
echo "===== 8. RE-RUN TYPECHECK ====="
pnpm --filter ./artifacts/api-server typecheck
