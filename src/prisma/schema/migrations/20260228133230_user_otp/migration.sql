-- CreateEnum
CREATE TYPE "UserOtpPurposeEnum" AS ENUM ('email_verification', 'password_reset', 'login_2fa');

-- CreateTable
CREATE TABLE "user_otps" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" "UserOtpPurposeEnum" NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_otps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_otps_userId_purpose_idx" ON "user_otps"("userId", "purpose");

-- CreateIndex
CREATE INDEX "user_otps_expiresAt_idx" ON "user_otps"("expiresAt");

-- AddForeignKey
ALTER TABLE "user_otps" ADD CONSTRAINT "user_otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
