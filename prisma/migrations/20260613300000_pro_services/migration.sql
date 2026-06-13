-- CreateEnum
CREATE TYPE "ProServiceType" AS ENUM ('UAE_VISA_NEW', 'UAE_VISA_RENEWAL', 'UAE_VISA_CANCELLATION', 'UAE_EMIRATES_ID_NEW', 'UAE_EMIRATES_ID_RENEWAL', 'UAE_ESTABLISHMENT_CARD', 'UAE_ECHANNEL_REGISTRATION', 'UAE_MEDICAL_FITNESS', 'UAE_GDRFA_SERVICE', 'UAE_DED_TRANSACTION', 'UAE_ATTESTATION', 'UAE_TYPING_SERVICE', 'UAE_EJARI_REGISTRATION', 'UAE_TRADE_LICENSE_RENEWAL', 'KSA_IQAMA_NEW', 'KSA_IQAMA_RENEWAL', 'KSA_QIWA_REGISTRATION', 'KSA_MUQEEM_REGISTRATION', 'KSA_GOSI_REGISTRATION', 'KSA_LABOUR_CONTRACT', 'KSA_EXIT_REENTRY_VISA', 'KSA_DEPENDENT_VISA', 'KSA_ATTESTATION', 'KSA_MINISTRY_HR_TRANSACTION', 'KSA_TRADE_LICENSE_RENEWAL', 'DOCUMENT_ATTESTATION', 'NOTARISATION', 'OTHER');
CREATE TYPE "ProServiceStage" AS ENUM ('SUBMITTED', 'DOCUMENTS_PENDING', 'DOCUMENTS_RECEIVED', 'IN_PROGRESS', 'AT_TYPING_CENTRE', 'AT_GOVERNMENT', 'AWAITING_COLLECTION', 'COMPLETED', 'ON_HOLD', 'CANCELLED');
CREATE TYPE "ServiceUrgency" AS ENUM ('STANDARD', 'EXPRESS', 'URGENT');

-- CreateTable
CREATE TABLE "ProServiceRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "jurisdiction" "Jurisdiction" NOT NULL DEFAULT 'UAE',
    "serviceType" "ProServiceType" NOT NULL,
    "serviceDescription" TEXT,
    "urgency" "ServiceUrgency" NOT NULL DEFAULT 'STANDARD',
    "stage" "ProServiceStage" NOT NULL DEFAULT 'SUBMITTED',
    "governingBody" TEXT,
    "referenceNumber" TEXT,
    "requestedBy" TEXT,
    "fee" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "invoiceId" TEXT,
    "slaDays" INTEGER,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "clientNotes" TEXT,
    "internalNotes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProServiceActivity" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stage" "ProServiceStage",
    "note" TEXT NOT NULL,
    "isClientVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProServiceActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProServiceRequest_organizationId_idx" ON "ProServiceRequest"("organizationId");
CREATE INDEX "ProServiceRequest_organizationId_stage_idx" ON "ProServiceRequest"("organizationId", "stage");
CREATE INDEX "ProServiceRequest_organizationId_deletedAt_idx" ON "ProServiceRequest"("organizationId", "deletedAt");
CREATE INDEX "ProServiceRequest_memberId_idx" ON "ProServiceRequest"("memberId");
CREATE INDEX "ProServiceRequest_assignedTo_idx" ON "ProServiceRequest"("assignedTo");
CREATE INDEX "ProServiceRequest_organizationId_dueDate_idx" ON "ProServiceRequest"("organizationId", "dueDate");
CREATE INDEX "ProServiceActivity_requestId_idx" ON "ProServiceActivity"("requestId");

-- AddForeignKey
ALTER TABLE "ProServiceRequest" ADD CONSTRAINT "ProServiceRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProServiceRequest" ADD CONSTRAINT "ProServiceRequest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProServiceActivity" ADD CONSTRAINT "ProServiceActivity_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ProServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
