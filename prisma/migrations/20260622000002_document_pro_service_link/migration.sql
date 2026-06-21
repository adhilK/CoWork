-- Add optional PRO service request link to Document
-- Allows documents uploaded through the PRO service workflow to be linked to a specific request.

ALTER TABLE "Document" ADD COLUMN "proServiceRequestId" TEXT;

ALTER TABLE "Document" ADD CONSTRAINT "Document_proServiceRequestId_fkey"
  FOREIGN KEY ("proServiceRequestId") REFERENCES "ProServiceRequest"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Document_proServiceRequestId_idx" ON "Document"("proServiceRequestId");
