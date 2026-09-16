-- CreateTable
CREATE TABLE "OcppCommand" (
    "id" TEXT NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OcppCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcppCommand_chargePointId_idx" ON "OcppCommand"("chargePointId");

-- CreateIndex
CREATE INDEX "OcppCommand_status_idx" ON "OcppCommand"("status");

-- CreateIndex
CREATE INDEX "OcppCommand_command_idx" ON "OcppCommand"("command");

-- AddForeignKey
ALTER TABLE "OcppCommand" ADD CONSTRAINT "OcppCommand_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "ChargePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
