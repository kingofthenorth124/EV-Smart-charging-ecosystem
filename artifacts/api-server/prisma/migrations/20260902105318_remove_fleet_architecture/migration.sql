-- Remove Fleet architecture safely

DROP TABLE IF EXISTS "fleet_wallets" CASCADE;

DROP TABLE IF EXISTS "fleet_members" CASCADE;

DROP TABLE IF EXISTS "fleets" CASCADE;


DROP TYPE IF EXISTS "FleetStatus";

DROP TYPE IF EXISTS "FleetMemberRole";
