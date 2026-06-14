-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'AGENCY', 'FREELANCER', 'OTHER');
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FIXED');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'CONVERTED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "type" "PartnerType" NOT NULL DEFAULT 'INDIVIDUAL',
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
    "commissionRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "payoutDetails" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "serviceDescription" TEXT,
    "leadId" TEXT,
    "memberId" TEXT,
    "dealValue" DECIMAL(10,2),
    "commissionAmount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "convertedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "payoutReference" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Partner_organizationId_idx" ON "Partner"("organizationId");
CREATE INDEX "Partner_organizationId_deletedAt_idx" ON "Partner"("organizationId", "deletedAt");
CREATE INDEX "Referral_organizationId_idx" ON "Referral"("organizationId");
CREATE INDEX "Referral_organizationId_status_idx" ON "Referral"("organizationId", "status");
CREATE INDEX "Referral_organizationId_deletedAt_idx" ON "Referral"("organizationId", "deletedAt");
CREATE INDEX "Referral_partnerId_idx" ON "Referral"("partnerId");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
