/*
  Warnings:

  - The values [pickup,delivery,hub_handover] on the enum `UserOtpPurposeEnum` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `backgroundCheckDate` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `backgroundCheckNotes` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `backgroundCheckStatus` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `commissionRate` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `externalAgentId` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `hubId` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `pendingPayout` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `totalPaidOut` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleNationalId` on the `drivers` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `isManualOverride` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `lastAttemptAt` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `maxAttempts` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `overrideBy` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `overrideReason` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `qrCodeData` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `shipmentId` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedBy` on the `user_otps` table. All the data in the column will be lost.
  - You are about to drop the `external_agents` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserOtpPurposeEnum_new" AS ENUM ('email_verification', 'phone_verification', 'password_reset', 'login_2fa');
ALTER TABLE "user_otps" ALTER COLUMN "purpose" TYPE "UserOtpPurposeEnum_new" USING ("purpose"::text::"UserOtpPurposeEnum_new");
ALTER TYPE "UserOtpPurposeEnum" RENAME TO "UserOtpPurposeEnum_old";
ALTER TYPE "UserOtpPurposeEnum_new" RENAME TO "UserOtpPurposeEnum";
DROP TYPE "public"."UserOtpPurposeEnum_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_externalAgentId_fkey";

-- DropForeignKey
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_hubId_fkey";

-- DropIndex
DROP INDEX "user_otps_shipmentId_idx";

-- DropIndex
DROP INDEX "user_otps_status_idx";

-- AlterTable
ALTER TABLE "documents" ALTER COLUMN "itemId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "drivers" DROP COLUMN "backgroundCheckDate",
DROP COLUMN "backgroundCheckNotes",
DROP COLUMN "backgroundCheckStatus",
DROP COLUMN "commissionRate",
DROP COLUMN "externalAgentId",
DROP COLUMN "hubId",
DROP COLUMN "pendingPayout",
DROP COLUMN "totalPaidOut",
DROP COLUMN "vehicleNationalId",
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "hubs" ALTER COLUMN "city" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_otps" DROP COLUMN "ipAddress",
DROP COLUMN "isManualOverride",
DROP COLUMN "lastAttemptAt",
DROP COLUMN "maxAttempts",
DROP COLUMN "overrideBy",
DROP COLUMN "overrideReason",
DROP COLUMN "qrCodeData",
DROP COLUMN "shipmentId",
DROP COLUMN "status",
DROP COLUMN "verifiedBy";

-- DropTable
DROP TABLE "external_agents";

-- DropEnum
DROP TYPE "BackgroundCheckStatusEnum";

-- DropEnum
DROP TYPE "OtpStatus";
