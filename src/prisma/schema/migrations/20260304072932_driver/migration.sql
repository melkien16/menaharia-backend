/*
  Warnings:

  - A unique constraint covering the columns `[vehiclePlateNumber]` on the table `drivers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "bankAccountHolderName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "insuranceExpiryDate" TIMESTAMP(3),
ADD COLUMN     "insurancePolicyNumber" TEXT,
ADD COLUMN     "insuranceUrl" TEXT,
ADD COLUMN     "licenseBackUrl" TEXT,
ADD COLUMN     "licenseExpiryDate" TIMESTAMP(3),
ADD COLUMN     "licenseFrontUrl" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "vehicleBackUrl" TEXT,
ADD COLUMN     "vehicleFrontUrl" TEXT,
ADD COLUMN     "vehicleMake" TEXT,
ADD COLUMN     "vehicleModel" TEXT,
ADD COLUMN     "vehiclePlateNumber" VARCHAR(20),
ADD COLUMN     "vehicleType" TEXT,
ADD COLUMN     "vehicleYear" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "drivers_vehiclePlateNumber_key" ON "drivers"("vehiclePlateNumber");
