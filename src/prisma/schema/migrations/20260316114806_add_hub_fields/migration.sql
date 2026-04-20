/*
  Warnings:

  - Added the required column `city` to the `hubs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BackgroundCheckStatusEnum" AS ENUM ('not_started', 'in_progress', 'passed', 'failed');

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "backgroundCheckDate" TIMESTAMP(3),
ADD COLUMN     "backgroundCheckNotes" TEXT,
ADD COLUMN     "backgroundCheckStatus" "BackgroundCheckStatusEnum" NOT NULL DEFAULT 'not_started',
ADD COLUMN     "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 10,
ADD COLUMN     "driverPhotoDocId" UUID,
ADD COLUMN     "externalAgentId" UUID,
ADD COLUMN     "hubId" UUID,
ADD COLUMN     "insuranceDocId" UUID,
ADD COLUMN     "licenseBackDocId" UUID,
ADD COLUMN     "licenseFrontDocId" UUID,
ADD COLUMN     "pendingPayout" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "registrationDocId" UUID,
ADD COLUMN     "totalPaidOut" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "vehicleBackDocId" UUID,
ADD COLUMN     "vehicleFrontDocId" UUID;

-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "address" TEXT,
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "city" VARCHAR(100) NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "managerName" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "external_agents" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "stationName" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "ownerName" TEXT,
    "bankAccount" TEXT,
    "bankName" TEXT,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "external_agents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "hubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_externalAgentId_fkey" FOREIGN KEY ("externalAgentId") REFERENCES "external_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
