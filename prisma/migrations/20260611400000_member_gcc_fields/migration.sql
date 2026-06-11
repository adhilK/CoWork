-- GCC member fields: WhatsApp, nationality, encrypted ID docs, visa expiry
ALTER TABLE "Member" ADD COLUMN "whatsAppNumber" TEXT;
ALTER TABLE "Member" ADD COLUMN "nationality"    TEXT;
ALTER TABLE "Member" ADD COLUMN "passportNumber" TEXT;
ALTER TABLE "Member" ADD COLUMN "emiratesId"     TEXT;
ALTER TABLE "Member" ADD COLUMN "iqamaNumber"    TEXT;
ALTER TABLE "Member" ADD COLUMN "visaExpiry"     TIMESTAMP(3);
