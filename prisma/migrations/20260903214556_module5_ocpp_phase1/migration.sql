/*
  Warnings:

  - You are about to drop the `payment_idempotency_keys` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ChargePointStatus" AS ENUM ('AVAILABLE', 'PREPARING', 'CHARGING', 'SUSPENDED', 'FINISHING', 'UNAVAILABLE', 'FAULTED');

-- DropForeignKey
ALTER TABLE "payment_idempotency_keys" DROP CONSTRAINT "payment_idempotency_user_fk";

-- DropTable
DROP TABLE "payment_idempotency_keys";

-- CreateTable
CREATE TABLE "ChargePoint" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "vendor" TEXT,
    "model" TEXT,
    "firmwareVersion" TEXT,
    "protocolVersion" TEXT NOT NULL DEFAULT 'OCPP1.6',
    "status" "ChargePointStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "lastHeartbeat" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargePoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "connectorNumber" INTEGER NOT NULL,
    "status" "ChargePointStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "Connector_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChargePoint_serialNumber_key" ON "ChargePoint"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Connector_chargePointId_connectorNumber_key" ON "Connector"("chargePointId", "connectorNumber");

-- AddForeignKey
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "ChargePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
