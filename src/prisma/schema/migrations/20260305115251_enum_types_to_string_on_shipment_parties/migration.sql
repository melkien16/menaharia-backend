/*
  Warnings:

  - Changed the type of `role` on the `shipment_parties` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "shipment_parties" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL;
