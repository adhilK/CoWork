-- PDPL Compliance: consent logging + right-to-erasure audit trail
-- UAE Personal Data Protection Law (PDPL) + Saudi Arabia PDPL requirements.

-- ── ConsentType enum ─────────────────────────────────────────────────────────
CREATE TYPE "ConsentType" AS ENUM ('DATA_PROCESSING', 'MARKETING', 'COOKIES');

-- ── ConsentLog: immutable audit record per consent action ────────────────────
-- Rows are append-only (PDPL compliance). The most recent row per
-- (userId, consentType) represents the current consent state.
CREATE TABLE "ConsentLog" (
  "id"             TEXT          NOT NULL,
  "userId"         TEXT          NOT NULL,
  "organizationId" TEXT,
  "consentType"    "ConsentType" NOT NULL,
  "consentGiven"   BOOLEAN       NOT NULL,
  "ipAddress"      TEXT,
  "userAgent"      TEXT,
  "version"        TEXT          NOT NULL DEFAULT '1.0',
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentLog_userId_idx"             ON "ConsentLog"("userId");
CREATE INDEX "ConsentLog_organizationId_idx"     ON "ConsentLog"("organizationId");
CREATE INDEX "ConsentLog_userId_consentType_idx" ON "ConsentLog"("userId", "consentType");
CREATE INDEX "ConsentLog_createdAt_idx"          ON "ConsentLog"("createdAt");

-- ── DataErasureLog: audit trail for right-to-erasure executions ─────────────
CREATE TABLE "DataErasureLog" (
  "id"               TEXT         NOT NULL,
  "organizationId"   TEXT         NOT NULL,
  "memberId"         TEXT         NOT NULL,
  "userId"           TEXT         NOT NULL,
  "executedBy"       TEXT         NOT NULL,
  "documentsDeleted" INTEGER      NOT NULL DEFAULT 0,
  "fieldsAnonymized" TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataErasureLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataErasureLog_organizationId_idx" ON "DataErasureLog"("organizationId");
CREATE INDEX "DataErasureLog_memberId_idx"       ON "DataErasureLog"("memberId");
CREATE INDEX "DataErasureLog_createdAt_idx"      ON "DataErasureLog"("createdAt");

-- ── Member: track when PII was soft-anonymized ───────────────────────────────
-- erasedAt is set when right-to-erasure is executed. Invoices are retained for
-- VAT audit trail (KSA: 5 years ZATCA, UAE: 5 years FTA).
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "erasedAt" TIMESTAMP(3);
