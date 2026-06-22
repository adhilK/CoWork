-- Add per-service checklist steps to ProServiceRequest
ALTER TABLE "ProServiceRequest" ADD COLUMN "steps" JSONB NOT NULL DEFAULT '[]';

-- Add businessSetupLeadId FK to Document (for document attachment on BS leads)
ALTER TABLE "Document" ADD COLUMN "businessSetupLeadId" TEXT;
ALTER TABLE "Document" ADD CONSTRAINT "Document_businessSetupLeadId_fkey"
  FOREIGN KEY ("businessSetupLeadId") REFERENCES "BusinessSetupLead"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Document_businessSetupLeadId_idx" ON "Document"("businessSetupLeadId");
