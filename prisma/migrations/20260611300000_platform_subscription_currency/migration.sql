-- Add currency (billing currency from org jurisdiction) and monthlyFee (null until plan activated)
ALTER TABLE "PlatformSubscription" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'AED';
ALTER TABLE "PlatformSubscription" ADD COLUMN "monthlyFee" DECIMAL(10,2);
