-- Add event_id + seat_id to booking_seats and enforce per-event uniqueness

-- AlterTable
ALTER TABLE "booking_seats"
ADD COLUMN "event_id" TEXT,
ADD COLUMN "seat_id" TEXT;

-- Make legacy grid columns nullable for seatId-based layouts
ALTER TABLE "booking_seats" ALTER COLUMN "row" DROP NOT NULL;
ALTER TABLE "booking_seats" ALTER COLUMN "seat_number" DROP NOT NULL;

-- Backfill event_id based on booking_id
UPDATE "booking_seats" bs
SET "event_id" = b."event_id"
FROM "bookings" b
WHERE bs."booking_id" = b."id";

-- Enforce NOT NULL after backfill
ALTER TABLE "booking_seats" ALTER COLUMN "event_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "booking_seats_event_id_seat_id_key" ON "booking_seats"("event_id", "seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_seats_event_id_section_id_row_seat_number_key" ON "booking_seats"("event_id", "section_id", "row", "seat_number");
