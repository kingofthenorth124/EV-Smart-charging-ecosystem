-- CreateTable
CREATE TABLE "OcppTransaction" (
    "id" TEXT NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "idTag" TEXT,
    "meterStart" INTEGER NOT NULL DEFAULT 0,
    "meterStop" INTEGER,
    "energyWh" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stoppedAt" TIMESTAMP(3),

    CONSTRAINT "OcppTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OcppTransaction_transactionId_key" ON "OcppTransaction"("transactionId");

-- CreateIndex
CREATE INDEX "OcppTransaction_chargePointId_idx" ON "OcppTransaction"("chargePointId");

-- CreateIndex
CREATE INDEX "OcppTransaction_connectorId_idx" ON "OcppTransaction"("connectorId");

-- AddForeignKey
ALTER TABLE "OcppTransaction" ADD CONSTRAINT "OcppTransaction_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "ChargePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcppTransaction" ADD CONSTRAINT "OcppTransaction_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
