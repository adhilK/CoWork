/**
 * Build the document payload for Wafeq's ZATCA submission endpoints.
 * Handles both simplified (B2C) and standard (B2B) invoice types.
 */

export type ZatcaAddress = {
  street?: string;
  buildingNumber?: string;
  district?: string;
  city?: string;
  postalCode?: string;
};

export type OrgForPayload = {
  name: string;
  taxRegistrationNumber: string | null;
  zatcaVatNumber: string | null;
  zatcaCrNumber: string | null;
  zatcaAddress: unknown; // stored as Json in Prisma
};

export type MemberForPayload = {
  company: string | null;
  user: { name: string | null; email: string };
};

export type LineItemForPayload = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoiceForPayload = {
  id: string;
  invoiceNumber: string | null;
  createdAt: Date;
  totalAmount: number;
  subtotal: number;
  vatAmount: number;
  vatRate: number; // 0.15 for KSA
  currency: string;
  lineItems: LineItemForPayload[];
};

export type WafeqDocumentPayload = {
  document: Record<string, unknown>;
  language: "ar";
};

/**
 * Determine whether an invoice is simplified (B2C) or standard (B2B clearance).
 * ZATCA rule: simplified if total < SAR 1000 OR buyer has no company registration.
 */
export function isSimplifiedInvoice(
  invoice: Pick<InvoiceForPayload, "totalAmount">,
  member: Pick<MemberForPayload, "company">
): boolean {
  return invoice.totalAmount < 1000 || !member.company;
}

/** Map Invoice + Org + Member to the Wafeq document payload format. */
export function buildWafeqPayload(
  invoice: InvoiceForPayload,
  org: OrgForPayload,
  member: MemberForPayload
): WafeqDocumentPayload {
  const addr = (org.zatcaAddress ?? {}) as ZatcaAddress;
  const vatNumber = org.zatcaVatNumber ?? org.taxRegistrationNumber ?? "";
  const issueDate = invoice.createdAt.toISOString().split("T")[0];
  const ref = invoice.invoiceNumber ?? `INV-${invoice.id.slice(-8).toUpperCase()}`;
  const taxPct = Math.round(invoice.vatRate * 100); // 15 for KSA

  const document: Record<string, unknown> = {
    invoice_reference_number: ref,
    issue_date: issueDate,
    supply_date: issueDate,
    currency: invoice.currency || "SAR",

    supplier: {
      name: org.name,
      tax_registration_number: vatNumber,
      ...(org.zatcaCrNumber
        ? { identification: { value: org.zatcaCrNumber, scheme: "CRN" } }
        : {}),
      address: {
        street: addr.street ?? "N/A",
        ...(addr.buildingNumber ? { building_number: addr.buildingNumber } : {}),
        ...(addr.district ? { district: addr.district } : {}),
        city: addr.city ?? "Riyadh",
        country_code: "SA",
        ...(addr.postalCode ? { postal_code: addr.postalCode } : {}),
      },
    },

    customer: {
      name: member.company ?? member.user.name ?? member.user.email,
      address: { country_code: "SA" },
    },

    line_items: invoice.lineItems.map((li) => ({
      name: li.description,
      quantity: li.quantity,
      unit_price: li.unitPrice,
      tax_percentage: taxPct,
      discount: 0,
    })),
  };

  return { document, language: "ar" };
}
