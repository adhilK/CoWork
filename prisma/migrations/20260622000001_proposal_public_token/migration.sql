-- Add public sharing token to BusinessSetupProposal
-- Generated when proposal status transitions to SENT; allows unauthenticated client access.

ALTER TABLE "BusinessSetupProposal" ADD COLUMN "publicToken" TEXT;
ALTER TABLE "BusinessSetupProposal" ADD COLUMN "publicTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "BusinessSetupProposal_publicToken_key" ON "BusinessSetupProposal"("publicToken");
