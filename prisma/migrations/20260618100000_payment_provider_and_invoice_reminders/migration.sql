-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('TAP', 'MOYASAR');

-- AlterTable: Invoice — payment gateway IDs + overdue reminder tracking
ALTER TABLE "Invoice"
  ADD COLUMN "moyasarPaymentId"  TEXT,
  ADD COLUMN "moyasarCheckoutUrl" TEXT,
  ADD COLUMN "remindersSent"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastReminderAt"    TIMESTAMP(3);

-- AlterTable: Organization — payment gateway selection (default TAP)
ALTER TABLE "Organization"
  ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'TAP';
