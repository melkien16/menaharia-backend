/*
  Warnings:

  - The `status` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `location` on the `user_addresses` table. The data in that column could be lost. The data in that column will be cast from `ByteA` to `Unsupported("geography(Point, 4326)")`.
  - Added the required column `type` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionTypeEnum" AS ENUM ('ORDER_PAYMENT', 'COURIER_PAYMENT', 'VENDOR_PAYOUT', 'DRIVER_PAYOUT', 'AGENT_COMMISSION', 'REFUND', 'INTERNAL_DRIVER_COMMISSION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionStatusEnum" ADD VALUE 'PROCESSING';
ALTER TYPE "TransactionStatusEnum" ADD VALUE 'REFUNDED';

-- DropIndex
DROP INDEX "external_agents_userId_idx";

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "agentId" UUID,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "driverId" UUID,
ADD COLUMN     "orderId" UUID,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "shipmentId" UUID,
ADD COLUMN     "type" "TransactionTypeEnum" NOT NULL,
ADD COLUMN     "vendorId" UUID,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
DROP COLUMN "status",
ADD COLUMN     "status" "TransactionStatusEnum" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "user_addresses" ALTER COLUMN "location" SET DATA TYPE geography(Point, 4326);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "external_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
