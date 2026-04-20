/*
  Warnings:

  - You are about to drop the column `city` on the `hubs` table. All the data in the column will be lost.
  - You are about to drop the column `serviceRadiusKm` on the `hubs` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OtpStatus" AS ENUM ('pending', 'verified', 'expired', 'failed');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserOtpPurposeEnum" ADD VALUE 'pickup';
ALTER TYPE "UserOtpPurposeEnum" ADD VALUE 'delivery';
ALTER TYPE "UserOtpPurposeEnum" ADD VALUE 'hub_handover';

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "city" TEXT,
ADD COLUMN     "driverPhoto" TEXT,
ADD COLUMN     "experienceYears" INTEGER,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "registrationDoc" TEXT,
ADD COLUMN     "subCity" TEXT,
ADD COLUMN     "vehicleNationalId" VARCHAR(50),
ADD COLUMN     "woreda" TEXT;

-- AlterTable
ALTER TABLE "hubs" DROP COLUMN IF EXISTS "city",
DROP COLUMN IF EXISTS "serviceRadiusKm";

-- AlterTable
ALTER TABLE "user_otps" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "overrideBy" UUID,
ADD COLUMN     "overrideReason" TEXT,
ADD COLUMN     "qrCodeData" TEXT,
ADD COLUMN     "shipmentId" UUID,
ADD COLUMN     "status" "OtpStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "verifiedBy" UUID;

-- CreateIndex
CREATE INDEX "user_otps_status_idx" ON "user_otps"("status");

-- CreateIndex
CREATE INDEX "user_otps_shipmentId_idx" ON "user_otps"("shipmentId");
