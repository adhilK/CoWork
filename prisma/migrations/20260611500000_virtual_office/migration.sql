-- CreateEnum
CREATE TYPE "VirtualAddressType" AS ENUM ('MAINLAND', 'FREEZONE', 'OFFSHORE', 'PREMIUM_BUSINESS_DISTRICT');

-- CreateEnum
CREATE TYPE "VirtualOfficeStatus" AS ENUM ('ACTIVE', 'PENDING_RENEWAL', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MailType" AS ENUM ('LETTER', 'PACKAGE', 'LEGAL_DOCUMENT', 'GOVERNMENT_CORRESPONDENCE', 'COURIER', 'OTHER');

-- AlterTable: add virtualOfficeSubscriptionId to Invoice
ALTER TABLE "Invoice" ADD COLUMN "virtualOfficeSubscriptionId" TEXT;

-- CreateTable: VirtualOfficeAddress
CREATE TABLE "VirtualOfficeAddress" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL DEFAULT 'UAE',
    "addressLine" TEXT NOT NULL,
    "addressType" "VirtualAddressType" NOT NULL DEFAULT 'MAINLAND',
    "freezoneName" TEXT,
    "ejariNumber" TEXT,
    "maxClients" INTEGER NOT NULL DEFAULT 50,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualOfficeAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable: VirtualOfficeSubscription
CREATE TABLE "VirtualOfficeSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "status" "VirtualOfficeStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualOfficeSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MailItem
CREATE TABLE "MailItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "senderName" TEXT,
    "senderAddress" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mailType" "MailType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "trackingNumber" TEXT,
    "scanPath" TEXT,
    "forwardedAt" TIMESTAMP(3),
    "forwardedTo" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VirtualOfficeAddress_organizationId_idx" ON "VirtualOfficeAddress"("organizationId");
CREATE INDEX "VirtualOfficeAddress_organizationId_deletedAt_idx" ON "VirtualOfficeAddress"("organizationId", "deletedAt");
CREATE INDEX "VirtualOfficeAddress_organizationId_isActive_idx" ON "VirtualOfficeAddress"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "VirtualOfficeSubscription_organizationId_idx" ON "VirtualOfficeSubscription"("organizationId");
CREATE INDEX "VirtualOfficeSubscription_memberId_idx" ON "VirtualOfficeSubscription"("memberId");
CREATE INDEX "VirtualOfficeSubscription_addressId_idx" ON "VirtualOfficeSubscription"("addressId");
CREATE INDEX "VirtualOfficeSubscription_organizationId_deletedAt_idx" ON "VirtualOfficeSubscription"("organizationId", "deletedAt");
CREATE INDEX "VirtualOfficeSubscription_organizationId_status_idx" ON "VirtualOfficeSubscription"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MailItem_organizationId_idx" ON "MailItem"("organizationId");
CREATE INDEX "MailItem_addressId_idx" ON "MailItem"("addressId");
CREATE INDEX "MailItem_subscriptionId_idx" ON "MailItem"("subscriptionId");
CREATE INDEX "MailItem_organizationId_deletedAt_idx" ON "MailItem"("organizationId", "deletedAt");
CREATE INDEX "MailItem_organizationId_receivedAt_idx" ON "MailItem"("organizationId", "receivedAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_virtualOfficeSubscriptionId_fkey"
    FOREIGN KEY ("virtualOfficeSubscriptionId") REFERENCES "VirtualOfficeSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VirtualOfficeAddress" ADD CONSTRAINT "VirtualOfficeAddress_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VirtualOfficeSubscription" ADD CONSTRAINT "VirtualOfficeSubscription_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VirtualOfficeSubscription" ADD CONSTRAINT "VirtualOfficeSubscription_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VirtualOfficeSubscription" ADD CONSTRAINT "VirtualOfficeSubscription_addressId_fkey"
    FOREIGN KEY ("addressId") REFERENCES "VirtualOfficeAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MailItem" ADD CONSTRAINT "MailItem_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MailItem" ADD CONSTRAINT "MailItem_addressId_fkey"
    FOREIGN KEY ("addressId") REFERENCES "VirtualOfficeAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MailItem" ADD CONSTRAINT "MailItem_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "VirtualOfficeSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
