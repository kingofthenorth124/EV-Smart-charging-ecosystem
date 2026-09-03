-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('RFID', 'APP', 'API_TOKEN');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "charging_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL DEFAULT 'RFID',
    "identifier" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charging_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "charging_credentials_identifier_key" ON "charging_credentials"("identifier");

-- CreateIndex
CREATE INDEX "charging_credentials_identifier_idx" ON "charging_credentials"("identifier");

-- CreateIndex
CREATE INDEX "charging_credentials_userId_idx" ON "charging_credentials"("userId");

-- AddForeignKey
ALTER TABLE "charging_credentials" ADD CONSTRAINT "charging_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
