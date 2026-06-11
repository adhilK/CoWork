-- GCC Edition: add VAT-compliant money breakdown to Invoice.
-- `amount` is retained (deprecated) and kept equal to `totalAmount`.
ALTER TABLE "Invoice" ADD COLUMN "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "vatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill existing invoices: the legacy `amount` was the (VAT-exclusive) total,
-- so historical invoices keep subtotal == total and vatRate/vatAmount == 0.
UPDATE "Invoice" SET "subtotal" = "amount", "totalAmount" = "amount";
