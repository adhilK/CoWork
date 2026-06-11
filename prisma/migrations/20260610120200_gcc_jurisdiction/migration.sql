-- GCC Edition: Jurisdiction (UAE/KSA) support.

-- CreateEnum
CREATE TYPE "Jurisdiction" AS ENUM ('UAE', 'KSA');

-- AlterTable: org primary jurisdiction (existing orgs default to UAE)
ALTER TABLE "Organization" ADD COLUMN "jurisdiction" "Jurisdiction" NOT NULL DEFAULT 'UAE';

-- CreateTable
CREATE TABLE "JurisdictionConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jurisdictions" "Jurisdiction"[] DEFAULT ARRAY[]::"Jurisdiction"[],
    "primaryJurisdiction" "Jurisdiction" NOT NULL DEFAULT 'UAE',
    "vatRateUAE" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
    "vatRateKSA" DECIMAL(5,4) NOT NULL DEFAULT 0.15,
    "currencyUAE" TEXT NOT NULL DEFAULT 'AED',
    "currencyKSA" TEXT NOT NULL DEFAULT 'SAR',
    "zatcaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "arabicInvoices" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JurisdictionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JurisdictionConfig_organizationId_key" ON "JurisdictionConfig"("organizationId");

-- AddForeignKey
ALTER TABLE "JurisdictionConfig" ADD CONSTRAINT "JurisdictionConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
