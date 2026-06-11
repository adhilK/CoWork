-- Add Tap payment gateway charge ID to Invoice for GCC member billing
ALTER TABLE "Invoice" ADD COLUMN "tapChargeId" TEXT;
