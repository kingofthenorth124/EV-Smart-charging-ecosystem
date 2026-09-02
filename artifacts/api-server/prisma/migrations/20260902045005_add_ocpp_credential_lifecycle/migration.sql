-- AlterTable
ALTER TABLE "charging_credentials" ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "lastUsedAt" TIMESTAMP(3);
