-- Create password_reset_otps table
CREATE TABLE "password_reset_otps" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "otp_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_otps_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "password_reset_otps" ADD CONSTRAINT "password_reset_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX "password_reset_otps_user_id_idx" ON "password_reset_otps"("user_id");
CREATE INDEX "password_reset_otps_expires_at_idx" ON "password_reset_otps"("expires_at");
CREATE INDEX "password_reset_otps_consumed_at_idx" ON "password_reset_otps"("consumed_at");
