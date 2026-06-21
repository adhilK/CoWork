-- Add public/external booking fields to Resource
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "externalBookingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "externalHourlyRate" DECIMAL(10,2);
