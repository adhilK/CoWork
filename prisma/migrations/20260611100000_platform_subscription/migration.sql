-- PlatformSubscription: tracks CoWork Pro platform billing per operator org.
-- Created at TRIAL on org registration. Stripe Atlas updates status to ACTIVE.
-- NOTE: Member billing uses Tap (not Stripe) — this model is operator-only.

CREATE TYPE "PlatformSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

CREATE TABLE "PlatformSubscription" (
  "id"                   TEXT NOT NULL,
  "organizationId"       TEXT NOT NULL,
  "status"               "PlatformSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "plan"                 "Plan" NOT NULL,
  "stripeCustomerId"     TEXT,
  "stripeSubscriptionId" TEXT,
  "trialEndsAt"          TIMESTAMP(3),
  "currentPeriodStart"   TIMESTAMP(3),
  "currentPeriodEnd"     TIMESTAMP(3),
  "cancelledAt"          TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformSubscription_organizationId_key"
  ON "PlatformSubscription"("organizationId");

ALTER TABLE "PlatformSubscription"
  ADD CONSTRAINT "PlatformSubscription_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Back-fill existing orgs with a TRIAL subscription so all rows are consistent
INSERT INTO "PlatformSubscription" ("id", "organizationId", "status", "plan", "trialEndsAt", "updatedAt")
SELECT
  'psub_' || SUBSTRING(id FROM 1 FOR 20),
  id,
  'TRIAL'::"PlatformSubscriptionStatus",
  plan,
  "trialEndsAt",
  NOW()
FROM "Organization";
