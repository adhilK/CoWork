-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('BOOKING_CONFIRMATION', 'BOOKING_REMINDER', 'INVOICE_ISSUED', 'INVOICE_PAID', 'VISITOR_ARRIVAL', 'DOCUMENT_EXPIRY', 'BUSINESS_SETUP_UPDATE', 'PRO_SERVICE_UPDATE', 'MAIL_RECEIVED', 'RENEWAL_REMINDER', 'ANNOUNCEMENT', 'SUPPORT_MESSAGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('UTILITY', 'MARKETING', 'AUTHENTICATION');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateTable: WhatsAppConfig
CREATE TABLE "WhatsAppConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "businessAccountId" TEXT NOT NULL,
    "verifyToken" TEXT NOT NULL,
    "displayNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WhatsAppMessage
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT,
    "broadcastId" TEXT,
    "phone" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "messageType" "WhatsAppMessageType" NOT NULL DEFAULT 'CUSTOM',
    "templateName" TEXT,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "waMessageId" TEXT,
    "status" "WhatsAppStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WhatsAppTemplate
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "WhatsAppTemplateCategory" NOT NULL DEFAULT 'UTILITY',
    "language" TEXT NOT NULL DEFAULT 'en',
    "body" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "WhatsAppTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: WhatsAppBroadcast
CREATE TABLE "WhatsAppBroadcast" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateName" TEXT,
    "content" TEXT NOT NULL,
    "audienceFilter" JSONB,
    "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConfig_organizationId_key" ON "WhatsAppConfig"("organizationId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_organizationId_idx" ON "WhatsAppMessage"("organizationId");
CREATE INDEX "WhatsAppMessage_memberId_idx" ON "WhatsAppMessage"("memberId");
CREATE INDEX "WhatsAppMessage_organizationId_status_idx" ON "WhatsAppMessage"("organizationId", "status");
CREATE INDEX "WhatsAppMessage_organizationId_phone_idx" ON "WhatsAppMessage"("organizationId", "phone");
CREATE INDEX "WhatsAppMessage_organizationId_sentAt_idx" ON "WhatsAppMessage"("organizationId", "sentAt");
CREATE INDEX "WhatsAppMessage_broadcastId_idx" ON "WhatsAppMessage"("broadcastId");
CREATE INDEX "WhatsAppMessage_waMessageId_idx" ON "WhatsAppMessage"("waMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_organizationId_name_key" ON "WhatsAppTemplate"("organizationId", "name");
CREATE INDEX "WhatsAppTemplate_organizationId_idx" ON "WhatsAppTemplate"("organizationId");
CREATE INDEX "WhatsAppTemplate_organizationId_deletedAt_idx" ON "WhatsAppTemplate"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcast_organizationId_idx" ON "WhatsAppBroadcast"("organizationId");
CREATE INDEX "WhatsAppBroadcast_organizationId_status_idx" ON "WhatsAppBroadcast"("organizationId", "status");
CREATE INDEX "WhatsAppBroadcast_organizationId_deletedAt_idx" ON "WhatsAppBroadcast"("organizationId", "deletedAt");

-- AddForeignKey
ALTER TABLE "WhatsAppConfig" ADD CONSTRAINT "WhatsAppConfig_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_broadcastId_fkey"
    FOREIGN KEY ("broadcastId") REFERENCES "WhatsAppBroadcast"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppBroadcast" ADD CONSTRAINT "WhatsAppBroadcast_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
