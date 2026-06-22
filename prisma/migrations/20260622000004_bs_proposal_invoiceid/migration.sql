-- Add invoiceId to BusinessSetupProposal for invoice generation tracking
ALTER TABLE "BusinessSetupProposal" ADD COLUMN "invoiceId" TEXT;
ALTER TABLE "BusinessSetupProposal" ADD CONSTRAINT "BusinessSetupProposal_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
