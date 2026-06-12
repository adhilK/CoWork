-- CreateEnum
CREATE TYPE "ZatcaStatus" AS ENUM ('PENDING', 'REPORTED', 'CLEARED', 'REJECTED');

-- AlterTable: Invoice — ZATCA e-invoicing fields (KSA)
ALTER TABLE "Invoice" ADD COLUMN "zatcaUuid" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "zatcaHash" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "zatcaQrCode" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "zatcaStatus" "ZatcaStatus";
ALTER TABLE "Invoice" ADD COLUMN "zatcaReportedAt" TIMESTAMP(3);
