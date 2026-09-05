/*
  Warnings:

  - Added the required column `stationId` to the `Connector` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Connector" ADD COLUMN     "stationId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
