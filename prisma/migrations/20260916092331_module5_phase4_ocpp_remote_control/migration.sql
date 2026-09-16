/*
  Warnings:

  - A unique constraint covering the columns `[chargingSessionId]` on the table `OcppTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "OcppTransaction" ADD COLUMN     "chargingSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OcppTransaction_chargingSessionId_key" ON "OcppTransaction"("chargingSessionId");

-- AddForeignKey
ALTER TABLE "OcppTransaction" ADD CONSTRAINT "OcppTransaction_chargingSessionId_fkey" FOREIGN KEY ("chargingSessionId") REFERENCES "charging_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
