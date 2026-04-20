-- CreateEnum
CREATE TYPE "public"."PricingTypeEnum" AS ENUM ('base', 'per_km', 'per_kg', 'priority', 'intercity');

-- CreateEnum
CREATE TYPE "public"."VehicleCategoryEnum" AS ENUM ('bike', 'motorbike', 'car', 'van', 'truck');

-- AlterTable
ALTER TABLE "public"."drivers"
    ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
    ADD COLUMN IF NOT EXISTS "bankAccountHolderName" TEXT,
    ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT,
    ADD COLUMN IF NOT EXISTS "bankName" TEXT,
    ADD COLUMN IF NOT EXISTS "insuranceExpiryDate" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" TEXT,
    ADD COLUMN IF NOT EXISTS "insuranceUrl" TEXT,
    ADD COLUMN IF NOT EXISTS "licenseBackUrl" TEXT,
    ADD COLUMN IF NOT EXISTS "licenseExpiryDate" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "licenseFrontUrl" TEXT,
    ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
    ADD COLUMN IF NOT EXISTS "vehicleBackUrl" TEXT,
    ADD COLUMN IF NOT EXISTS "vehicleFrontUrl" TEXT,
    ADD COLUMN IF NOT EXISTS "vehicleMake" TEXT,
    ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT,
    ADD COLUMN IF NOT EXISTS "vehiclePlateNumber" VARCHAR(20),
    ADD COLUMN IF NOT EXISTS "vehicleType" TEXT,
    ADD COLUMN IF NOT EXISTS "vehicleYear" INTEGER;

-- AlterTable
ALTER TABLE "public"."hubs" ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "serviceRadiusKm" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "public"."inter_city_pricing" (
    "id" UUID NOT NULL,
    "originHubId" UUID NOT NULL,
    "destinationHubId" UUID NOT NULL,
    "basePrice" DECIMAL(10,2) NOT NULL,
    "pricePerKg" DECIMAL(8,2) NOT NULL,
    "estimatedDays" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inter_city_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pricing_configs" (
    "id" UUID NOT NULL,
    "type" "public"."PricingTypeEnum" NOT NULL,
    "vehicleCategory" "public"."VehicleCategoryEnum",
    "zoneCode" VARCHAR(50),
    "amount" DECIMAL(10,2) NOT NULL,
    "minAmount" DECIMAL(10,2),
    "maxAmount" DECIMAL(10,2),
    "priorityMultiplier" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."zones" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "boundary" geography(Polygon, 4326),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inter_city_pricing_originHubId_destinationHubId_key" ON "public"."inter_city_pricing"("originHubId" ASC, "destinationHubId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "pricing_configs_type_vehicleCategory_zoneCode_key" ON "public"."pricing_configs"("type" ASC, "vehicleCategory" ASC, "zoneCode" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "zones_code_key" ON "public"."zones"("code" ASC);

-- AddForeignKey
ALTER TABLE "public"."inter_city_pricing" ADD CONSTRAINT "inter_city_pricing_destinationHubId_fkey" FOREIGN KEY ("destinationHubId") REFERENCES "public"."hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inter_city_pricing" ADD CONSTRAINT "inter_city_pricing_originHubId_fkey" FOREIGN KEY ("originHubId") REFERENCES "public"."hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

