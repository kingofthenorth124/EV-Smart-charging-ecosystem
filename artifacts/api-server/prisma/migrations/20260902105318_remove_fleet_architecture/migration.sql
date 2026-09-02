-- DropForeignKey
ALTER TABLE "fleet_members" DROP CONSTRAINT "fleet_members_fleetId_fkey";

-- DropForeignKey
ALTER TABLE "fleet_members" DROP CONSTRAINT "fleet_members_userId_fkey";

-- DropForeignKey
ALTER TABLE "fleet_wallets" DROP CONSTRAINT "fleet_wallets_fleetId_fkey";

-- DropTable
DROP TABLE "fleets";

-- DropTable
DROP TABLE "fleet_members";

-- DropTable
DROP TABLE "fleet_wallets";

-- DropEnum
DROP TYPE "FleetStatus";

-- DropEnum
DROP TYPE "FleetMemberRole";

