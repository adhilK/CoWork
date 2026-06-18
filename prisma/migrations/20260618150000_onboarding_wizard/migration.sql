-- Onboarding wizard: capture business profile + payment setup on the Organization.

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "businessType" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "tapSecretKey" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "moyasarApiKey" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "bankTransferDetails" JSONB;
