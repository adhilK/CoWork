-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'EMIRATES_ID', 'IQAMA', 'VISA', 'TRADE_LICENSE', 'EJARI', 'ESTABLISHMENT_CARD', 'SHARE_CERTIFICATE', 'MOA', 'AOA', 'BANK_STATEMENT', 'INSURANCE_CERTIFICATE', 'POWER_OF_ATTORNEY', 'TENANCY_CONTRACT', 'MEDICAL_FITNESS', 'POLICE_CLEARANCE', 'DEGREE_CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'OVERDUE', 'CANCELLED');

-- CreateTable: Document
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "label" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "issueDate" TIMESTAMP(3),
    "issueCountry" TEXT,
    "documentNumber" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DocumentRequest
CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "message" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "fulfilledAt" TIMESTAMP(3),
    "fulfilledDocId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");
CREATE INDEX "Document_memberId_idx" ON "Document"("memberId");
CREATE INDEX "Document_organizationId_expiryDate_idx" ON "Document"("organizationId", "expiryDate");
CREATE INDEX "Document_organizationId_deletedAt_idx" ON "Document"("organizationId", "deletedAt");
CREATE INDEX "Document_memberId_deletedAt_idx" ON "Document"("memberId", "deletedAt");

-- CreateIndex
CREATE INDEX "DocumentRequest_organizationId_idx" ON "DocumentRequest"("organizationId");
CREATE INDEX "DocumentRequest_memberId_idx" ON "DocumentRequest"("memberId");
CREATE INDEX "DocumentRequest_organizationId_status_idx" ON "DocumentRequest"("organizationId", "status");
CREATE INDEX "DocumentRequest_memberId_status_idx" ON "DocumentRequest"("memberId", "status");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Document" ADD CONSTRAINT "Document_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
