-- Add layoutType/layoutJson to Venue and Event

-- CreateEnum
CREATE TYPE "LayoutType" AS ENUM ('GRID', 'CIRCULAR', 'STADIUM', 'FREE_FORM', 'TABLE');

-- AlterTable
ALTER TABLE "Event"
ADD COLUMN "layoutType" "LayoutType" NOT NULL DEFAULT 'GRID',
ADD COLUMN "layoutJson" JSONB;

-- AlterTable
ALTER TABLE "Venue"
ADD COLUMN "layoutType" "LayoutType" NOT NULL DEFAULT 'GRID',
ADD COLUMN "layoutJson" JSONB;
