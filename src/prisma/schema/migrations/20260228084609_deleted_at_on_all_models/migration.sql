/*
  Warnings:

  - The `status` column on the `driver_vehicle_assignments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `fulfillmentStatus` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `paymentStatus` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `accountStatus` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `verificationStatus` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `verificationStatus` column on the `vendors` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `driverType` on the `drivers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `approvalStatus` on the `drivers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `orderStatus` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `paymentMethod` on the `orders` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `legType` on the `shipment_legs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `shipment_legs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role` on the `shipment_parties` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `shipmentSource` on the `shipments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `shipments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `priority` on the `shipments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `gender` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `vehicles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `ownerType` on the `vehicles` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `paymentMethodType` on the `vendor_payment_methods` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AssignmentStatusEnum" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "DriverTypeEnum" AS ENUM ('internal', 'external');

-- CreateEnum
CREATE TYPE "ApprovalStatusEnum" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "OrderStatusEnum" AS ENUM ('created', 'paid', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "FulfillmentStatusEnum" AS ENUM ('pending', 'ready', 'shipped', 'delivered');

-- CreateEnum
CREATE TYPE "PaymentStatusEnum" AS ENUM ('pending', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentMethodEnum" AS ENUM ('telebirr', 'chapa', 'santim', 'wallet');

-- CreateEnum
CREATE TYPE "ProductStatusEnum" AS ENUM ('draft', 'active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "ShipmentLegTypeEnum" AS ENUM ('pickup', 'intercity', 'hub_transfer', 'last_mile');

-- CreateEnum
CREATE TYPE "ShipmentLegStatusEnum" AS ENUM ('pending', 'assigned', 'in_transit', 'completed');

-- CreateEnum
CREATE TYPE "ShipmentPartyRoleEnum" AS ENUM ('sender', 'receiver');

-- CreateEnum
CREATE TYPE "ShipmentSourceEnum" AS ENUM ('marketplace', 'pure_courier');

-- CreateEnum
CREATE TYPE "ShipmentStatusEnum" AS ENUM ('requested', 'assigned', 'picked_up', 'at_origin_hub', 'in_transit_intercity', 'at_destination_hub', 'out_for_delivery', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ShipmentPriorityEnum" AS ENUM ('normal', 'express', 'urgent');

-- CreateEnum
CREATE TYPE "AccountStatusEnum" AS ENUM ('active', 'suspended', 'locked', 'deleted', 'pending');

-- CreateEnum
CREATE TYPE "UserVerificationStatusEnum" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "GenderEnum" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "VehicleTypeEnum" AS ENUM ('bike', 'motor_bike', 'car', 'van', 'truck');

-- CreateEnum
CREATE TYPE "OwnerTypeEnum" AS ENUM ('company', 'external');

-- CreateEnum
CREATE TYPE "PaymentMethodTypeEnum" AS ENUM ('wallet', 'bank');

-- CreateEnum
CREATE TYPE "VendorVerificationStatusEnum" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "driver_vehicle_assignments" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "AssignmentStatusEnum" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "driverType",
ADD COLUMN     "driverType" "DriverTypeEnum" NOT NULL,
DROP COLUMN "approvalStatus",
ADD COLUMN     "approvalStatus" "ApprovalStatusEnum" NOT NULL;

-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "orderStatus",
ADD COLUMN     "orderStatus" "OrderStatusEnum" NOT NULL,
DROP COLUMN "fulfillmentStatus",
ADD COLUMN     "fulfillmentStatus" "FulfillmentStatusEnum",
DROP COLUMN "paymentStatus",
ADD COLUMN     "paymentStatus" "PaymentStatusEnum",
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethodEnum" NOT NULL;

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "ProductStatusEnum" NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "shipment_items" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "shipment_legs" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "legType",
ADD COLUMN     "legType" "ShipmentLegTypeEnum" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ShipmentLegStatusEnum" NOT NULL;

-- AlterTable
ALTER TABLE "shipment_parties" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "role",
ADD COLUMN     "role" "ShipmentPartyRoleEnum" NOT NULL;

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "shipmentSource",
ADD COLUMN     "shipmentSource" "ShipmentSourceEnum" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ShipmentStatusEnum" NOT NULL,
DROP COLUMN "priority",
ADD COLUMN     "priority" "ShipmentPriorityEnum" NOT NULL;

-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "accountStatus",
ADD COLUMN     "accountStatus" "AccountStatusEnum" NOT NULL DEFAULT 'active',
DROP COLUMN "verificationStatus",
ADD COLUMN     "verificationStatus" "UserVerificationStatusEnum" NOT NULL DEFAULT 'pending',
DROP COLUMN "gender",
ADD COLUMN     "gender" "GenderEnum" NOT NULL;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "type",
ADD COLUMN     "type" "VehicleTypeEnum" NOT NULL,
DROP COLUMN "ownerType",
ADD COLUMN     "ownerType" "OwnerTypeEnum" NOT NULL;

-- AlterTable
ALTER TABLE "vendor_payment_methods" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "paymentMethodType",
ADD COLUMN     "paymentMethodType" "PaymentMethodTypeEnum" NOT NULL;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "deletedAt" TIMESTAMP(3),
DROP COLUMN "verificationStatus",
ADD COLUMN     "verificationStatus" "VendorVerificationStatusEnum" NOT NULL DEFAULT 'pending';

-- DropEnum
DROP TYPE "ApprovalStatus";

-- DropEnum
DROP TYPE "AssignmentStatus";

-- DropEnum
DROP TYPE "DriverType";

-- DropEnum
DROP TYPE "FulfillmentStatus";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "OwnerType";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentMethodType";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "ProductStatus";

-- DropEnum
DROP TYPE "ShipmentLegStatus";

-- DropEnum
DROP TYPE "ShipmentLegType";

-- DropEnum
DROP TYPE "ShipmentPartyRole";

-- DropEnum
DROP TYPE "ShipmentPriority";

-- DropEnum
DROP TYPE "ShipmentSource";

-- DropEnum
DROP TYPE "ShipmentStatus";

-- DropEnum
DROP TYPE "VehicleType";

-- DropEnum
DROP TYPE "VerificationStatus";
