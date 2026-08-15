-- Enforce at most one ACTIVE charging session per user at the database level.
CREATE UNIQUE INDEX "charging_sessions_one_active_per_user"
  ON "charging_sessions" ("userId")
  WHERE "status" = 'ACTIVE';

-- Station availability can never go negative.
ALTER TABLE "stations"
  ADD CONSTRAINT "stations_connectors_available_non_negative"
  CHECK ("connectorsAvailable" >= 0);

-- Wallet balances can never go negative.
ALTER TABLE "wallets"
  ADD CONSTRAINT "wallets_balance_non_negative"
  CHECK ("balanceKobo" >= 0);
