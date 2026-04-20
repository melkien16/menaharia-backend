/*
  Warnings:

  - The values [wallet] on the enum `PaymentMethodEnum` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `product_images` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethodEnum_new" AS ENUM ('telebirr', 'chapa', 'santim');
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" TYPE "PaymentMethodEnum_new" USING ("paymentMethod"::text::"PaymentMethodEnum_new");
ALTER TYPE "PaymentMethodEnum" RENAME TO "PaymentMethodEnum_old";
ALTER TYPE "PaymentMethodEnum_new" RENAME TO "PaymentMethodEnum";
DROP TYPE "public"."PaymentMethodEnum_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_productId_fkey";

-- DropTable
DROP TABLE "product_images";
