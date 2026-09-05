/*
  Warnings:

  - Added the required column `stationId` to the `OcppTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OcppTransaction" ADD COLUMN     "stationId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "OcppTransaction" ADD CONSTRAINT "OcppTransaction_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
