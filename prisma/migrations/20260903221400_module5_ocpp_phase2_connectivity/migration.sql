-- CreateTable
CREATE TABLE "OcppConnection" (
    "id" TEXT NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "remoteAddress" TEXT,
    "lastMessageAt" TIMESTAMP(3),

    CONSTRAINT "OcppConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeartbeatLog" (
    "id" TEXT NOT NULL,
    "chargePointId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "HeartbeatLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OcppConnection" ADD CONSTRAINT "OcppConnection_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "ChargePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeartbeatLog" ADD CONSTRAINT "HeartbeatLog_chargePointId_fkey" FOREIGN KEY ("chargePointId") REFERENCES "ChargePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
