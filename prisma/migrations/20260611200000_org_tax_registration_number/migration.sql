-- UAE TRN / KSA VAT number — mandatory on tax invoices for VAT-registered entities
ALTER TABLE "Organization" ADD COLUMN "taxRegistrationNumber" TEXT;
