-- AlterTable: add Dodo Payments customer/subscription IDs to platform billing
ALTER TABLE "PlatformSubscription" ADD COLUMN "dodoCustomerId" TEXT;
ALTER TABLE "PlatformSubscription" ADD COLUMN "dodoSubscriptionId" TEXT;

-- CreateTable: idempotency log for processed webhook events
CREATE TABLE "ProcessedWebhook" (
    "webhookId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("webhookId","source")
);
