-- AddValue: PAYMENT_REMINDER to WhatsAppMessageType enum
-- (used by daily-reminders job overdue-invoice section)
ALTER TYPE "WhatsAppMessageType" ADD VALUE IF NOT EXISTS 'PAYMENT_REMINDER';

-- Organization: Wafeq connected account + ZATCA Phase-2 onboarding fields
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "wafeqAccountId"  TEXT,
  ADD COLUMN IF NOT EXISTS "zatcaDeviceId"   TEXT,
  ADD COLUMN IF NOT EXISTS "zatcaCrNumber"   TEXT,
  ADD COLUMN IF NOT EXISTS "zatcaVatNumber"  TEXT,
  ADD COLUMN IF NOT EXISTS "zatcaAddress"    JSONB;

-- Invoice: Wafeq invoice reference returned after reporting/clearance
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "wafeqInvoiceId"  TEXT;
