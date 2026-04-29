-- Add optional latitude/longitude coordinates to Venue
ALTER TABLE "Venue"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;
