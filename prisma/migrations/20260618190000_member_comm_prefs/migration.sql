-- Member communication preferences (portal Profile)
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "notifyByEmail" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "notifyByWhatsApp" BOOLEAN NOT NULL DEFAULT true;
