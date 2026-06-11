-- AlterTable: Organization — multi-location / franchise flags
ALTER TABLE "Organization" ADD COLUMN "allowCrossLocationBooking" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "franchiseParentId" TEXT;

-- AlterTable: Location — Module 11 fields
ALTER TABLE "Location" ADD COLUMN "jurisdiction" "Jurisdiction" NOT NULL DEFAULT 'UAE';
ALTER TABLE "Location" ADD COLUMN "city" TEXT;
ALTER TABLE "Location" ADD COLUMN "country" TEXT;
ALTER TABLE "Location" ADD COLUMN "timezone" TEXT;
ALTER TABLE "Location" ADD COLUMN "phone" TEXT;
ALTER TABLE "Location" ADD COLUMN "email" TEXT;
ALTER TABLE "Location" ADD COLUMN "vatNumber" TEXT;
ALTER TABLE "Location" ADD COLUMN "managerUserId" TEXT;
ALTER TABLE "Location" ADD COLUMN "openingHours" JSONB;
ALTER TABLE "Location" ADD COLUMN "accessInstructions" TEXT;
ALTER TABLE "Location" ADD COLUMN "wifiName" TEXT;
ALTER TABLE "Location" ADD COLUMN "wifiPassword" TEXT;
ALTER TABLE "Location" ADD COLUMN "parentLocationId" TEXT;
ALTER TABLE "Location" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Location_organizationId_isActive_idx" ON "Location"("organizationId", "isActive");
CREATE INDEX "Location_organizationId_deletedAt_idx" ON "Location"("organizationId", "deletedAt");
