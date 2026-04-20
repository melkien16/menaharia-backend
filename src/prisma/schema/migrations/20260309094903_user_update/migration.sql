/*
  Warnings:

  - You are about to drop the column `nationalIdBackUrl` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `nationalIdFrontUrl` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `profilePictureUrl` on the `users` table. All the data in the column will be lost.
  - The `verificationStatus` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
ALTER TYPE "UserOtpPurposeEnum" ADD VALUE 'phone_verification';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "nationalIdBackUrl",
DROP COLUMN "nationalIdFrontUrl",
DROP COLUMN "profilePictureUrl",
ADD COLUMN     "emailVerificationStatus" TEXT NOT NULL DEFAULT 'pending',
ALTER COLUMN "nationalIdNo" DROP NOT NULL,
DROP COLUMN "verificationStatus",
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'pending';
