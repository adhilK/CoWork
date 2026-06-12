-- AlterTable: Visitor — GCC / reception fields (Module 9)
ALTER TABLE "Visitor" ADD COLUMN "nationality" TEXT;
ALTER TABLE "Visitor" ADD COLUMN "idType" TEXT;
ALTER TABLE "Visitor" ADD COLUMN "idNumber" TEXT;
ALTER TABLE "Visitor" ADD COLUMN "vehiclePlate" TEXT;
ALTER TABLE "Visitor" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "Visitor" ADD COLUMN "isBlacklisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Visitor" ADD COLUMN "blacklistReason" TEXT;
ALTER TABLE "Visitor" ADD COLUMN "whatsappNotified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Visitor" ADD COLUMN "deletedAt" TIMESTAMP(3);
-- updatedAt: add with a default to backfill existing rows, then drop the default.
ALTER TABLE "Visitor" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Visitor" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Visitor_organizationId_deletedAt_idx" ON "Visitor"("organizationId", "deletedAt");
CREATE INDEX "Visitor_organizationId_isBlacklisted_idx" ON "Visitor"("organizationId", "isBlacklisted");

-- CreateTable: Delivery
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT,
    "courierName" TEXT,
    "trackingNumber" TEXT,
    "description" TEXT,
    "photoUrl" TEXT,
    "receivedBy" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "collectedBy" TEXT,
    "whatsappNotified" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Delivery_organizationId_idx" ON "Delivery"("organizationId");
CREATE INDEX "Delivery_organizationId_deletedAt_idx" ON "Delivery"("organizationId", "deletedAt");
CREATE INDEX "Delivery_organizationId_collectedAt_idx" ON "Delivery"("organizationId", "collectedAt");
CREATE INDEX "Delivery_memberId_idx" ON "Delivery"("memberId");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
