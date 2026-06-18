/**
 * ZATCA (KSA e-invoicing / Fatoorah) — Phase 1 + Phase 2 via Wafeq.
 *
 * Phase 1 (Generation): TLV-encoded QR carrying the five mandatory ZATCA fields,
 * computed locally with no external service. Applied immediately when an invoice
 * is created for a KSA org with ZATCA enabled.
 *
 * Phase 2 (Integration): reporting / clearance via Wafeq middleware. Requires
 * WAFEQ_API_KEY + org.wafeqAccountId + org.zatcaDeviceId. When any of these are
 * missing the invoice is left in PENDING and the Inngest job will retry later.
 *
 * Credential-gating rule: if WAFEQ_API_KEY is not set, all Phase-2 calls are
 * skipped silently — the system remains fully functional, invoices stay PENDING.
 */

import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { isWafeqConfigured, submitSimplifiedInvoice, submitStandardInvoice } from "@/lib/zatca/wafeq";
import { buildWafeqPayload, isSimplifiedInvoice } from "@/lib/zatca/payload";

export const ZATCA_API_URL = process.env.ZATCA_API_URL ?? "";
export const ZATCA_SANDBOX_URL = process.env.ZATCA_SANDBOX_URL ?? "";

// ── Phase-1 TLV QR ────────────────────────────────────────────────────────────

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

/** Build the ZATCA Phase-1 QR payload: TLV tags 1–5, base64-encoded. */
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

/** Stable hash of the invoice (placeholder for the Phase-2 invoice hash / PIH). */
export function computeInvoiceHash(parts: {
  invoiceNumber: string;
  total: number;
  vatTotal: number;
  timestamp: string;
  vatNumber: string;
}): string {
  const canonical = [
    parts.invoiceNumber,
    parts.total.toFixed(2),
    parts.vatTotal.toFixed(2),
    parts.timestamp,
    parts.vatNumber,
  ].join("|");
  return createHash("sha256").update(canonical, "utf8").digest("base64");
}

/** Whether ZATCA applies: KSA jurisdiction + org has enabled e-invoicing. */
export function isZatcaRequired(
  jurisdiction?: string | null,
  zatcaEnabled?: boolean
): boolean {
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
 * Leaves the invoice PENDING (QR generated, awaiting Phase-2 reporting) and
 * returns the stamped fields. Submission is handled separately (queued job).
 */
export async function stampInvoiceForZatca(
  invoiceId: string
): Promise<ZatcaStampResult | null> {
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
  if (
    !isZatcaRequired(
      org.jurisdiction,
      org.jurisdictionConfig?.zatcaEnabled
    )
  )
    return null;

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
 * Phase-2 submission via Wafeq.
 *
 * Credential-gated: returns null (PENDING left intact) when WAFEQ_API_KEY is
 * not set or the org hasn't completed Wafeq onboarding (no accountId / deviceId).
 *
 * On success: updates zatcaStatus, zatcaUuid, zatcaQrCode, wafeqInvoiceId.
 * On failure: marks REJECTED so the Inngest onFailure handler surfaces it.
 */
export async function submitInvoiceToZatca(invoiceId: string): Promise<{
  status: "REPORTED" | "CLEARED" | "PENDING" | "REJECTED";
  wafeqInvoiceId?: string;
} | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          taxRegistrationNumber: true,
          zatcaVatNumber: true,
          zatcaCrNumber: true,
          zatcaAddress: true,
          wafeqAccountId: true,
          zatcaDeviceId: true,
          jurisdiction: true,
          jurisdictionConfig: { select: { zatcaEnabled: true } },
        },
      },
      member: {
        select: {
          company: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!invoice) return null;

  const org = invoice.organization;
  if (
    !isZatcaRequired(
      org.jurisdiction,
      org.jurisdictionConfig?.zatcaEnabled
    )
  )
    return null;

  if (!invoice.zatcaQrCode) return null; // not stamped yet

  // ── Credential gate ────────────────────────────────────────────────────────
  if (!isWafeqConfigured() || !org.wafeqAccountId || !org.zatcaDeviceId) {
    // Leave PENDING — credentials not yet configured. No-op.
    return { status: "PENDING" };
  }

  // ── Build payload ──────────────────────────────────────────────────────────
  const lineItems = (invoice.lineItems as { description: string; quantity: number; unitPrice: number; total: number }[]) ?? [];

  const invoiceData = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    createdAt: invoice.createdAt,
    totalAmount: Number(invoice.totalAmount),
    subtotal: Number(invoice.subtotal),
    vatAmount: Number(invoice.vatAmount),
    vatRate: Number(invoice.vatRate),
    currency: invoice.currency,
    lineItems,
  };

  const member = invoice.member ?? { company: null, user: { name: null, email: "" } };
  const payload = buildWafeqPayload(invoiceData, org, member);
  const simplified = isSimplifiedInvoice(invoiceData, member);

  // ── Submit to Wafeq ────────────────────────────────────────────────────────
  try {
    const result = simplified
      ? await submitSimplifiedInvoice(org.wafeqAccountId, payload)
      : await submitStandardInvoice(org.wafeqAccountId, payload);

    const newStatus = result.status === "CLEARED" ? "CLEARED" : "REPORTED";

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        zatcaStatus: newStatus,
        zatcaReportedAt: new Date(),
        zatcaUuid: result.uuid || invoice.zatcaUuid,
        // Overwrite Phase-1 QR with Wafeq's authoritative ZATCA-signed QR.
        zatcaQrCode: result.qr_code || invoice.zatcaQrCode,
        wafeqInvoiceId: result.id,
      },
    });

    return { status: newStatus, wafeqInvoiceId: result.id };
  } catch (err) {
    console.error("[zatca] Wafeq submission failed for invoice", invoiceId, err);
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { zatcaStatus: "REJECTED" },
    });
    return { status: "REJECTED" };
  }
}

/** Render a ZATCA QR base64 payload as a scannable PNG data URL. */
export async function zatcaQrToDataUrl(qrBase64: string): Promise<string | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    return await QRCode.toDataURL(qrBase64, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    });
  } catch {
    return null;
  }
}
