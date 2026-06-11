/**
 * Jurisdiction helpers (GCC Edition).
 *
 * Single source of truth for jurisdiction-derived values — VAT rate, currency,
 * etc. Per the conventions in CLAUDE.md, jurisdiction logic must NEVER be
 * hardcoded inline; it always goes through this module.
 *
 * NOTE: this uses a local string union rather than the Prisma `Jurisdiction`
 * enum so it can be imported safely regardless of `prisma generate` timing.
 * The values intentionally match the Prisma enum added in the JurisdictionConfig
 * migration.
 */

export type Jurisdiction = "UAE" | "KSA";

/** Statutory VAT rates by jurisdiction. */
export const VAT_RATES: Record<Jurisdiction, number> = {
  UAE: 0.05, // 5%
  KSA: 0.15, // 15%
};

/** Default currency by jurisdiction. */
export const JURISDICTION_CURRENCY: Record<Jurisdiction, string> = {
  UAE: "AED",
  KSA: "SAR",
};

/** Default timezone by jurisdiction. */
export const JURISDICTION_TIMEZONE: Record<Jurisdiction, string> = {
  UAE: "Asia/Dubai",
  KSA: "Asia/Riyadh",
};

/**
 * Resolve a jurisdiction from a possibly-null value, defaulting to UAE
 * (the Phase 1 primary market).
 */
export function resolveJurisdiction(value?: string | null): Jurisdiction {
  return value === "KSA" ? "KSA" : "UAE";
}

/** VAT rate (0–1) for a jurisdiction. Defaults to UAE 5%. */
export function getVatRate(jurisdiction?: string | null): number {
  return VAT_RATES[resolveJurisdiction(jurisdiction)];
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type InvoiceTotals = {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
};

/**
 * Compute a VAT-compliant invoice money breakdown from a VAT-exclusive
 * subtotal. Line-item totals are treated as VAT-exclusive (B2B convention in
 * the GCC); VAT is added on top.
 *
 * `total = subtotal + (subtotal * vatRate)`
 */
export function computeInvoiceTotals(
  subtotal: number,
  jurisdiction?: string | null
): InvoiceTotals {
  const vatRate = getVatRate(jurisdiction);
  const sub = round2(subtotal);
  const vatAmount = round2(sub * vatRate);
  const totalAmount = round2(sub + vatAmount);
  return { subtotal: sub, vatRate, vatAmount, totalAmount };
}

// ─── Platform billing pricing (display values — single source of truth) ────────
// All amounts are monthly, in AED or SAR as applicable.
// Never hardcode these in business logic — always reference this config.

export type PlatformPlanPricing = {
  aed: number | null; // null = Custom (Enterprise)
  sar: number | null;
};

export type PlatformAddonPricing = {
  aed: number | null; // null = not available in this jurisdiction
  sar: number | null;
  ksaOnly?: boolean;  // true = only shown to KSA orgs
};

export const PLATFORM_PLAN_PRICES: Record<string, PlatformPlanPricing> = {
  STARTER:    { aed: 299,  sar: 299  },
  GROWTH:     { aed: 549,  sar: 549  },
  PRO:        { aed: 1099, sar: 1099 },
  ENTERPRISE: { aed: null, sar: null },
};

export const PLATFORM_ADDON_PRICES: Record<string, PlatformAddonPricing> = {
  WHATSAPP:       { aed: 179,  sar: 179  },
  BUSINESS_SETUP: { aed: 299,  sar: 299  },
  PRO_SERVICES:   { aed: 179,  sar: 179  },
  ZATCA:          { aed: null, sar: 299,  ksaOnly: true },
  WHITE_LABEL:    { aed: 369,  sar: 369  },
  EXTRA_LOCATION: { aed: 179,  sar: 179  },
};

/** Return the monthly price for a plan/addon in the org's local currency, or null for custom. */
export function getPlatformPrice(
  pricing: PlatformPlanPricing | PlatformAddonPricing,
  jurisdiction: Jurisdiction
): number | null {
  return jurisdiction === "KSA" ? pricing.sar : pricing.aed;
}

/** Format a platform price for display: "AED 299" / "SAR 1,099" / "Custom". */
export function formatPlatformPrice(
  pricing: PlatformPlanPricing | PlatformAddonPricing,
  jurisdiction: Jurisdiction
): string {
  const currency = JURISDICTION_CURRENCY[jurisdiction];
  const amount = getPlatformPrice(pricing, jurisdiction);
  if (amount === null) return "Custom";
  return `${currency} ${amount.toLocaleString()}`;
}
