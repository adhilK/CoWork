/**
 * ZATCA (KSA e-invoicing / Fatoorah) — Phase 1 implementation + Phase 2 stub.
 *
 * Phase 1 (Generation) is REAL and standards-compliant: every KSA tax invoice
 * gets a TLV-encoded, base64 QR carrying the five mandatory fields. This is all
 * that's required for ZATCA Phase 1, and it's computed locally with no external
 * service.
 *
 * Phase 2 (Integration: cryptographic stamp, CSID, UBL 2.1 XML, clearance/
 * reporting via the ZATCA API) is STUBBED. Do NOT build the cryptographic
 * stamping here — per the project spec, Phase 2 must go through certified
 * middleware (e.g. Wafeq). `submitInvoiceToZatca` marks the invoice REPORTED so
 * the pipeline is exercised end-to-end; swap its body for the real provider call
 * when wired up.
 *
 * Refs: ZATCA E-Invoicing standards; QR TLV tags 1–5.
 */

import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const ZATCA_API_URL = process.env.ZATCA_API_URL ?? "";
export const ZATCA_SANDBOX_URL = process.env.ZATCA_SANDBOX_URL ?? "";

// ── Phase-1 TLV QR ────────────────────────────────────────────────────────────

/** Encode a single TLV (tag–length–value) field. Values < 256 bytes. */
function tlv(tag: number, value: string): Buffer {
  const val = Buffer.from(value, "utf8");
  return Buffer.concat([Buffer.from([tag]), Buffer.from([val.length]), val]);
}

export type ZatcaQrInput = {
  sellerName: string;
  vatNumber: string;
  /** ISO 8601, e.g. 2026-06-12T15:30:00Z */
  timestamp: string;
  /** Invoice total INCLUDING VAT */
  total: number;
  /** VAT total */
  vatTotal: number;
};

/**
 * Build the ZATCA Phase-1 QR payload: TLV tags 1–5, base64-encoded. This exact
 * string is what ZATCA's verification app decodes.
 */
export function buildZatcaQrBase64(d: ZatcaQrInput): string {
  const buf = Buffer.concat([
    tlv(1, d.sellerName),
    tlv(2, d.vatNumber),
    tlv(3, d.timestamp),
    tlv(4, d.total.toFixed(2)),
    tlv(5, d.vatTotal.toFixed(2)),
  ]);
  return buf.toString("base64");
}

/** A stable hash of the invoice (placeholder for the Phase-2 invoice hash/PIH). */
export function computeInvoiceHash(parts: {
  invoiceNumber: string;
  total: number;
  vatTotal: number;
  timestamp: string;
  vatNumber: string;
}): string {
  const canonical = [parts.invoiceNumber, parts.total.toFixed(2), parts.vatTotal.toFixed(2), parts.timestamp, parts.vatNumber].join("|");
  return createHash("sha256").update(canonical, "utf8").digest("base64");
}

/** Whether ZATCA applies: KSA jurisdiction + the org has enabled e-invoicing. */
export function isZatcaRequired(jurisdiction?: string | null, zatcaEnabled?: boolean): boolean {
  return jurisdiction === "KSA" && !!zatcaEnabled;
}

export type ZatcaStampResult = {
  zatcaUuid: string;
  zatcaHash: string;
  zatcaQrCode: string;
  zatcaStatus: "PENDING";
};

/**
 * Generate and persist the Phase-1 ZATCA fields for an invoice. No-op (returns
 * null) when the invoice's org isn't KSA or hasn't enabled ZATCA.
 *
 * Leaves the invoice in PENDING (QR generated, awaiting Phase-2 reporting) and
 * returns the stamped fields. Submission is handled separately (queued job).
 */
export async function stampInvoiceForZatca(invoiceId: string): Promise<ZatcaStampResult | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      organization: {
        select: {
          name: true,
          taxRegistrationNumber: true,
          jurisdiction: true,
          jurisdictionConfig: { select: { zatcaEnabled: true } },
        },
      },
    },
  });
  if (!invoice) return null;

  const org = invoice.organization;
  if (!isZatcaRequired(org.jurisdiction, org.jurisdictionConfig?.zatcaEnabled)) return null;

  const timestamp = new Date(invoice.createdAt).toISOString();
  const vatNumber = org.taxRegistrationNumber ?? "";
  const total = Number(invoice.totalAmount);
  const vatTotal = Number(invoice.vatAmount);

  const zatcaQrCode = buildZatcaQrBase64({
    sellerName: org.name,
    vatNumber,
    timestamp,
    total,
    vatTotal,
  });
  const zatcaHash = computeInvoiceHash({
    invoiceNumber: invoice.invoiceNumber ?? invoice.id,
    total,
    vatTotal,
    timestamp,
    vatNumber,
  });
  const zatcaUuid = randomUUID();

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { zatcaQrCode, zatcaHash, zatcaUuid, zatcaStatus: "PENDING" },
  });

  return { zatcaUuid, zatcaHash, zatcaQrCode, zatcaStatus: "PENDING" };
}

/**
 * Phase-2 submission — STUB.
 *
 * A real implementation signs the UBL 2.1 XML and submits to ZATCA's
 * reporting/clearance API (via certified middleware), then stores the cleared
 * response. Here we simply transition PENDING → REPORTED so the pipeline runs
 * end-to-end. Returns the new status, or null if nothing to do.
 */
export async function submitInvoiceToZatca(
  invoiceId: string
): Promise<{ status: "REPORTED" | "REJECTED"; stub: true } | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true, zatcaQrCode: true, zatcaStatus: true,
      organization: { select: { jurisdiction: true, jurisdictionConfig: { select: { zatcaEnabled: true } } } },
    },
  });
  if (!invoice) return null;
  if (!isZatcaRequired(invoice.organization.jurisdiction, invoice.organization.jurisdictionConfig?.zatcaEnabled)) return null;
  if (!invoice.zatcaQrCode) return null; // not stamped yet

  // ── Real provider call goes here (Wafeq / ZATCA API). ──
  // For the stub we report success.
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { zatcaStatus: "REPORTED", zatcaReportedAt: new Date() },
  });

  return { status: "REPORTED", stub: true };
}

/** Render a Phase-1 QR base64 payload as a scannable PNG data URL. */
export async function zatcaQrToDataUrl(qrBase64: string): Promise<string | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(qrBase64, { errorCorrectionLevel: "M", margin: 1, width: 220 });
  } catch {
    return null;
  }
}
