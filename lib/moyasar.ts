/**
 * Moyasar payment gateway — KSA secondary gateway.
 *
 * Better Mada (Saudi debit) and STC Pay coverage than Tap for KSA customers.
 * Docs: https://moyasar.com/docs
 *
 * Auth: HTTP Basic — API key as username, empty password.
 * Amounts: Moyasar uses minor units (halalas for SAR: 1 SAR = 100 halalas).
 *
 * Webhook: POST to your endpoint when payment status changes.
 * Signature: X-Signature header = HMAC-SHA256(raw body, MOYASAR_WEBHOOK_SECRET).
 */

const MOYASAR_API_URL = "https://api.moyasar.com/v1";

function moyasarHeaders(): Record<string, string> {
  const key = process.env.MOYASAR_API_KEY;
  if (!key) throw new Error("MOYASAR_API_KEY is not configured");
  // Basic auth: base64("apikey:")  — colon after key, no password.
  const encoded = Buffer.from(`${key}:`).toString("base64");
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
  };
}

export type MoyasarPaymentStatus =
  | "initiated"
  | "paid"
  | "failed"
  | "authorized"
  | "captured"
  | "refunded"
  | "voided";

export interface MoyasarPaymentRequest {
  /** Amount in major currency units (SAR not halalas). Converted internally. */
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, string>;
  /**
   * URL Moyasar redirects the customer to after payment. Also used as the
   * webhook POST target if MOYASAR_WEBHOOK_SECRET is set.
   * Moyasar does NOT replace placeholders — use query params for status polling.
   */
  callbackUrl: string;
}

export interface MoyasarPaymentResponse {
  id: string;
  status: MoyasarPaymentStatus;
  /** Amount in minor units (halalas/fils). */
  amountMinor: number;
  currency: string;
  description: string;
  /** Hosted checkout page URL — redirect the customer here. Valid for 24h. */
  checkoutUrl: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export async function createMoyasarPayment(
  req: MoyasarPaymentRequest
): Promise<MoyasarPaymentResponse> {
  // Convert major → minor units. SAR: 1 SAR = 100 halalas.
  const amountMinor = Math.round(req.amount * 100);

  const res = await fetch(`${MOYASAR_API_URL}/payments`, {
    method: "POST",
    headers: moyasarHeaders(),
    body: JSON.stringify({
      amount: amountMinor,
      currency: req.currency,
      description: req.description,
      callback_url: req.callbackUrl,
      metadata: req.metadata,
      source: {
        // "creditcard" source opens the Moyasar hosted page which supports
        // Visa/Mastercard, Mada, and STC Pay — customer selects their method
        // on the hosted page.
        type: "creditcard",
      },
    }),
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: res.statusText })) as { message?: string; errors?: Record<string, string[]> };
    const detail = err.message ?? (err.errors ? JSON.stringify(err.errors) : res.statusText);
    throw new Error(`Moyasar API error ${res.status}: ${detail}`);
  }

  const data = await res.json() as {
    id: string;
    status: MoyasarPaymentStatus;
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, string>;
    created_at: string;
    source: { type: string; url?: string };
  };

  return {
    id: data.id,
    status: data.status,
    amountMinor: data.amount,
    currency: data.currency,
    description: data.description,
    checkoutUrl: data.source.url ?? "",
    metadata: data.metadata ?? {},
    createdAt: data.created_at,
  };
}

/** Fetch a payment by ID — use to verify status on the return URL. */
export async function getMoyasarPayment(paymentId: string): Promise<MoyasarPaymentResponse> {
  const res = await fetch(`${MOYASAR_API_URL}/payments/${paymentId}`, {
    method: "GET",
    headers: moyasarHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
    throw new Error(`Moyasar API error ${res.status}: ${err.message ?? res.statusText}`);
  }

  const data = await res.json() as {
    id: string;
    status: MoyasarPaymentStatus;
    amount: number;
    currency: string;
    description: string;
    metadata: Record<string, string>;
    created_at: string;
    source: { type: string; url?: string };
  };

  return {
    id: data.id,
    status: data.status,
    amountMinor: data.amount,
    currency: data.currency,
    description: data.description,
    checkoutUrl: data.source.url ?? "",
    metadata: data.metadata ?? {},
    createdAt: data.created_at,
  };
}

/**
 * Verify Moyasar webhook authenticity.
 * Moyasar sends the HMAC-SHA256 of the raw request body in the X-Signature header.
 * Pass the raw body string (before JSON.parse) and the header value.
 */
export async function verifyMoyasarWebhook(
  rawBody: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[moyasar] MOYASAR_WEBHOOK_SECRET not set — skipping verification (dev only)");
    return true;
  }
  if (!signature) return false;

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(rawBody));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex === signature;
}
