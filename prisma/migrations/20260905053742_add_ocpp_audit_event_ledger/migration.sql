-- CreateTable
CREATE TABLE "OcppAuditEvent" (
    "id" TEXT NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "transactionId" INTEGER,
    "connectorId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OcppAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcppAuditEvent_chargePointId_idx" ON "OcppAuditEvent"("chargePointId");

-- CreateIndex
CREATE INDEX "OcppAuditEvent_transactionId_idx" ON "OcppAuditEvent"("transactionId");

-- CreateIndex
CREATE INDEX "OcppAuditEvent_action_idx" ON "OcppAuditEvent"("action");

-- CreateIndex
CREATE INDEX "OcppAuditEvent_createdAt_idx" ON "OcppAuditEvent"("createdAt");
