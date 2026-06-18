/**
 * Wafeq ZATCA middleware client.
 *
 * All calls are credential-gated: if WAFEQ_API_KEY is not set, every exported
 * function throws so callers can catch and mark invoices PENDING.
 *
 * API base: https://api.wafeq.com/v1/zatca/
 * Auth:     Authorization: Api-Key <key>
 * Env:      X-Zatca-Environment: simulation | production
 * Account:  X-ZATCA-Connected-Account-ID: <wafeqAccountId>
 */

const WAFEQ_BASE = "https://api.wafeq.com/v1/zatca";

function headers(accountId?: string | null): Record<string, string> {
  const key = process.env.WAFEQ_API_KEY;
  if (!key) throw new Error("WAFEQ_API_KEY is not configured");

  const env = (process.env.ZATCA_ENV ?? "simulation") as "simulation" | "production";
  const h: Record<string, string> = {
    Authorization: `Api-Key ${key}`,
    Accept: "application/json; version=v1",
    "Content-Type": "application/json",
    "X-Zatca-Environment": env,
  };
  if (accountId) h["X-ZATCA-Connected-Account-ID"] = accountId;
  return h;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({ detail: res.statusText }));
  if (!res.ok) {
    const detail = typeof body === "object" && body !== null
      ? JSON.stringify(body)
      : String(body);
    throw new Error(`Wafeq ${res.status}: ${detail}`);
  }
  return body as T;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WafeqAccount {
  id: string;          // wacc_*
  name: string;
  status: string;
}

export interface WafeqDevice {
  id: string;          // zdev_*
  common_name: string;
  status: string;
}

export interface WafeqInvoiceResult {
  id: string;          // zinv_*
  uuid: string;
  qr_code: string;     // base64-encoded TLV QR data (ZATCA Phase 1+2 compliant)
  status: string;      // "REPORTED" | "CLEARED"
  clearance_status?: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Create a Wafeq connected account scoped to this operator's org.
 * Returns the account ID to store on Organization.wafeqAccountId.
 */
export async function createConnectedAccount(org: {
  name: string;
  taxRegistrationNumber: string | null;
  zatcaCrNumber: string | null;
  zatcaAddress: { street?: string; city?: string; postalCode?: string } | null;
}): Promise<WafeqAccount> {
  const res = await fetch(`${WAFEQ_BASE}/connected-accounts/`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: org.name,
      tax_registration_number: org.taxRegistrationNumber ?? "",
      cr_number: org.zatcaCrNumber ?? "",
      address: org.zatcaAddress?.street ?? "N/A",
      city: org.zatcaAddress?.city ?? "Riyadh",
      country: "SA",
      business_category: "coworking_space",
    }),
  });
  return handleResponse<WafeqAccount>(res);
}

/**
 * Register a ZATCA device for this connected account using an OTP from the
 * Fatoorah portal. Returns the device ID to store on Organization.zatcaDeviceId.
 */
export async function registerDevice(
  accountId: string,
  otp: string,
  deviceName: string
): Promise<WafeqDevice> {
  const res = await fetch(`${WAFEQ_BASE}/devices/register/`, {
    method: "POST",
    headers: headers(accountId),
    body: JSON.stringify({ common_name: deviceName, otp }),
  });
  return handleResponse<WafeqDevice>(res);
}

/**
 * Report a simplified (B2C) invoice to ZATCA.
 * Use for: total < SAR 1000 OR buyer has no company registration.
 */
export async function submitSimplifiedInvoice(
  accountId: string,
  payload: { document: Record<string, unknown>; language: "ar" }
): Promise<WafeqInvoiceResult> {
  const res = await fetch(`${WAFEQ_BASE}/simplified-invoices/report/`, {
    method: "POST",
    headers: headers(accountId),
    body: JSON.stringify(payload),
  });
  return handleResponse<WafeqInvoiceResult>(res);
}

/**
 * Clear a standard (B2B) invoice with ZATCA.
 * Use for: total >= SAR 1000 AND buyer has a company registration.
 */
export async function submitStandardInvoice(
  accountId: string,
  payload: { document: Record<string, unknown>; language: "ar" }
): Promise<WafeqInvoiceResult> {
  const res = await fetch(`${WAFEQ_BASE}/invoices/report/`, {
    method: "POST",
    headers: headers(accountId),
    body: JSON.stringify(payload),
  });
  return handleResponse<WafeqInvoiceResult>(res);
}

/** Fetch current status of a previously submitted invoice. */
export async function getInvoiceStatus(
  accountId: string,
  wafeqInvoiceId: string
): Promise<WafeqInvoiceResult> {
  const res = await fetch(`${WAFEQ_BASE}/invoices/${wafeqInvoiceId}/`, {
    method: "GET",
    headers: headers(accountId),
  });
  return handleResponse<WafeqInvoiceResult>(res);
}

/** True when WAFEQ_API_KEY is present in the environment. */
export function isWafeqConfigured(): boolean {
  return !!process.env.WAFEQ_API_KEY;
}
