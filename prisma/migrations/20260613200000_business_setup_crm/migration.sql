-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW_ENQUIRY', 'QUALIFIED', 'PROPOSAL_SENT', 'DOCUMENTS_COLLECTION', 'SUBMITTED_TO_AUTHORITY', 'AWAITING_APPROVAL', 'APPROVED', 'COMPLETED', 'LOST');
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "LeadActivityType" AS ENUM ('NOTE', 'CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'STAGE_CHANGE', 'DOCUMENT_RECEIVED', 'PAYMENT_RECEIVED', 'PROPOSAL_SENT', 'REMINDER_SENT');
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "BusinessSetupLead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT,
    "assignedTo" TEXT,
    "jurisdiction" "Jurisdiction" NOT NULL DEFAULT 'UAE',
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT NOT NULL,
    "clientWhatsapp" TEXT,
    "clientNationality" TEXT,
    "companyName" TEXT,
    "licenseType" "LicenseType" NOT NULL,
    "licenseCatalogId" TEXT,
    "freezoneName" TEXT,
    "sezName" TEXT,
    "businessActivity" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW_ENQUIRY',
    "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedFee" DECIMAL(10,2),
    "quotedFee" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "notes" TEXT,
    "source" TEXT,
    "expectedCloseDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSetupLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" "LeadActivityType" NOT NULL DEFAULT 'NOTE',
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSetupProposal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "lineItems" JSONB NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalFee" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "sentAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSetupProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSetupApplication" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "referenceNumber" TEXT,
    "authorityName" TEXT,
    "currentStep" TEXT,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSetupApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessSetupLead_organizationId_idx" ON "BusinessSetupLead"("organizationId");
CREATE INDEX "BusinessSetupLead_organizationId_stage_idx" ON "BusinessSetupLead"("organizationId", "stage");
CREATE INDEX "BusinessSetupLead_organizationId_deletedAt_idx" ON "BusinessSetupLead"("organizationId", "deletedAt");
CREATE INDEX "BusinessSetupLead_assignedTo_idx" ON "BusinessSetupLead"("assignedTo");
CREATE INDEX "BusinessSetupLead_memberId_idx" ON "BusinessSetupLead"("memberId");
CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");
CREATE UNIQUE INDEX "BusinessSetupProposal_leadId_key" ON "BusinessSetupProposal"("leadId");
CREATE INDEX "BusinessSetupProposal_organizationId_idx" ON "BusinessSetupProposal"("organizationId");
CREATE UNIQUE INDEX "BusinessSetupApplication_leadId_key" ON "BusinessSetupApplication"("leadId");
CREATE INDEX "BusinessSetupApplication_organizationId_idx" ON "BusinessSetupApplication"("organizationId");

-- AddForeignKey
ALTER TABLE "BusinessSetupLead" ADD CONSTRAINT "BusinessSetupLead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessSetupLead" ADD CONSTRAINT "BusinessSetupLead_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "BusinessSetupLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessSetupProposal" ADD CONSTRAINT "BusinessSetupProposal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "BusinessSetupLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessSetupApplication" ADD CONSTRAINT "BusinessSetupApplication_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "BusinessSetupLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
