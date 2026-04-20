/*
  Warnings:

  - You are about to drop the column `currentLocation` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `hubs` table. All the data in the column will be lost.
  - You are about to drop the column `destination` on the `shipment_legs` table. All the data in the column will be lost.
  - You are about to drop the column `origin` on the `shipment_legs` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `shipment_parties` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `boundary` on the `zones` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `shipment_parties` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "drivers" DROP COLUMN "currentLocation";

-- AlterTable
ALTER TABLE "hubs" DROP COLUMN "location";

-- AlterTable
ALTER TABLE "shipment_legs" DROP COLUMN "destination",
DROP COLUMN "origin";

-- AlterTable
ALTER TABLE "shipment_parties" DROP COLUMN "location";
ALTER TABLE "shipment_parties" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "vendors" DROP COLUMN "location";

-- AlterTable
ALTER TABLE "zones" DROP COLUMN "boundary";
