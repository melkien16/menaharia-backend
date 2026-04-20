/*
  Warnings:

  - You are about to drop the column `businessName` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `businessRegNumber` on the `vendors` table. All the data in the column will be lost.
  - You are about to drop the column `taxId` on the `vendors` table. All the data in the column will be lost.
  - Added the required column `businessType` to the `vendors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `vendors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `region` to the `vendors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storeName` to the `vendors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "vendors" DROP COLUMN "businessName",
DROP COLUMN "businessRegNumber",
DROP COLUMN "taxId",
ADD COLUMN     "accountHolderName" VARCHAR(255),
ADD COLUMN     "accountNumber" VARCHAR(100),
ADD COLUMN     "bankName" VARCHAR(100),
ADD COLUMN     "businessLicensePath" TEXT,
ADD COLUMN     "businessType" VARCHAR(100) NOT NULL,
ADD COLUMN     "category" VARCHAR(100) NOT NULL,
ADD COLUMN     "endTime" VARCHAR(10),
ADD COLUMN     "ownerIdPath" TEXT,
ADD COLUMN     "region" VARCHAR(100) NOT NULL,
ADD COLUMN     "registrationNumber" VARCHAR(100),
ADD COLUMN     "startTime" VARCHAR(10),
ADD COLUMN     "storeName" VARCHAR(255) NOT NULL,
ADD COLUMN     "subCity" VARCHAR(100),
ADD COLUMN     "taxCertificatePath" TEXT,
ADD COLUMN     "woreda" VARCHAR(50);
