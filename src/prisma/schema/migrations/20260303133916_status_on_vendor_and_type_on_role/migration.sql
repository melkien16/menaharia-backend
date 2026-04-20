-- CreateEnum
CREATE TYPE "RoleTypeEnum" AS ENUM ('system', 'custom');

-- CreateEnum
CREATE TYPE "VendorStatusEnum" AS ENUM ('draft', 'active', 'inactive');

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "type" "RoleTypeEnum" NOT NULL DEFAULT 'system';

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "status" "VendorStatusEnum" NOT NULL DEFAULT 'draft';
