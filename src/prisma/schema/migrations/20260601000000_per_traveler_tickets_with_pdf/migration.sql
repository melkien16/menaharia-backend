-- Drop existing tickets table (schema is fundamentally restructured to per-traveler tickets)
DROP TABLE IF EXISTS "tickets";

-- CreateTable: tickets (per-traveler with PDF storage)
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "traveler_id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "qr_code" TEXT NOT NULL,
    "pdf_url" TEXT,
    "pdf_public_id" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tickets_traveler_id_key" ON "tickets"("traveler_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_booking_id_idx" ON "tickets"("booking_id");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "bookings"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_traveler_id_fkey"
    FOREIGN KEY ("traveler_id") REFERENCES "traveler_information"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
