/*
  Warnings:

  - Added the required column `date` to the `trips` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "transport_partners" ADD COLUMN     "about" TEXT,
ADD COLUMN     "badge" TEXT[],
ADD COLUMN     "established" INTEGER,
ADD COLUMN     "logo" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "reliability_score" INTEGER,
ADD COLUMN     "safety_info" TEXT;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "amenities" TEXT[],
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "highlights" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_date_idx" ON "trips"("date");
