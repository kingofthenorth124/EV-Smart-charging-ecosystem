
CREATE TABLE IF NOT EXISTS "payment_idempotency_keys" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "response" JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP,

    CONSTRAINT "payment_idempotency_user_fk"
    FOREIGN KEY ("userId")
    REFERENCES "users"("id")
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS
"payment_idempotency_key_idx"
ON "payment_idempotency_keys"("key");

