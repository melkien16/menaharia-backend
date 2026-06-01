-- Create operator_ratings table
CREATE TABLE "operator_ratings" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "operator_ratings_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "operator_ratings" ADD CONSTRAINT "operator_ratings_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "transport_partners"("id") ON DELETE CASCADE;
ALTER TABLE "operator_ratings" ADD CONSTRAINT "operator_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "operator_ratings" ADD CONSTRAINT "operator_ratings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL;

-- Indexes
CREATE INDEX "operator_ratings_operator_id_idx" ON "operator_ratings"("operator_id");
CREATE INDEX "operator_ratings_user_id_idx" ON "operator_ratings"("user_id");
CREATE INDEX "operator_ratings_booking_id_idx" ON "operator_ratings"("booking_id");
