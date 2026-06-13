-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('UAE_MAINLAND_DED', 'UAE_FREEZONE', 'UAE_OFFSHORE_RAKICC', 'UAE_OFFSHORE_JAFZA', 'UAE_BRANCH_OFFICE', 'KSA_MAINLAND_MISA', 'KSA_SEZ_KAFD', 'KSA_SEZ_JAZAN', 'KSA_SEZ_NEOM', 'KSA_BRANCH_OFFICE', 'KSA_REPRESENTATIVE_OFFICE');

-- CreateTable
CREATE TABLE "LicenseCatalog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jurisdiction" "Jurisdiction" NOT NULL DEFAULT 'UAE',
    "licenseType" "LicenseType" NOT NULL,
    "authority" TEXT NOT NULL,
    "emirate" TEXT,
    "name" TEXT NOT NULL,
    "activityCategory" TEXT,
    "description" TEXT,
    "baseCost" DECIMAL(10,2),
    "govFees" DECIMAL(10,2),
    "visaQuota" INTEGER,
    "officeType" TEXT,
    "minShareCapital" DECIMAL(12,2),
    "tenureYears" INTEGER NOT NULL DEFAULT 1,
    "processingDays" INTEGER,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "templateKey" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LicenseCatalog_organizationId_idx" ON "LicenseCatalog"("organizationId");
CREATE INDEX "LicenseCatalog_organizationId_jurisdiction_idx" ON "LicenseCatalog"("organizationId", "jurisdiction");
CREATE INDEX "LicenseCatalog_organizationId_deletedAt_idx" ON "LicenseCatalog"("organizationId", "deletedAt");
CREATE INDEX "LicenseCatalog_organizationId_licenseType_idx" ON "LicenseCatalog"("organizationId", "licenseType");

-- AddForeignKey
ALTER TABLE "LicenseCatalog" ADD CONSTRAINT "LicenseCatalog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
