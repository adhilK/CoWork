// Tap payment gateway — primary GCC payment provider (UAE/KSA/KW/BH).
// Platform billing (operator subscriptions) uses Stripe Atlas, NOT this module.
// Docs: https://developers.tap.company/reference

const TAP_API_URL = "https://api.tap.company/v2";

export type TapChargeStatus =
  | "INITIATED"
  | "AUTHORIZED"
  | "CAPTURED"
  | "VOID"
  | "REFUNDED"
  | "DECLINED"
  | "RESTRICTED"
  | "CANCELLED"
  | "TIMEDOUT"
  | "UNKNOWN";

export interface TapChargeRequest {
  amount: number;
  currency: string;
  description: string;
  metadata: Record<string, string>;
  customerEmail: string;
  customerName: string;
  /** Tap replaces {id} and {status} literals in this URL before redirecting. */
  redirectUrl: string;
  /** Webhook URL Tap will POST the charge result to. */
  postUrl: string;
  referenceTransaction?: string;
}

export interface TapChargeResponse {
  id: string;
  status: TapChargeStatus;
  amount: number;
  currency: string;
  transaction: {
    url: string;
    created: string;
    expiry?: { period: number; type: string };
  };
  metadata: Record<string, string>;
  reference?: { transaction: string; order: string };
}

export async function createTapCharge(
  req: TapChargeRequest,
  secretKeyOverride?: string
): Promise<TapChargeResponse> {
  const secretKey = secretKeyOverride ?? process.env.TAP_SECRET_KEY;
  if (!secretKey) throw new Error("TAP_SECRET_KEY is not configured");

  const parts = req.customerName.trim().split(" ");
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName;

  const res = await fetch(`${TAP_API_URL}/charges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: req.amount,
      currency: req.currency,
      customer_initiated: true,
      threeDSecure: true,
      save_card: false,
      description: req.description,
      metadata: req.metadata,
      reference: {
        transaction: req.referenceTransaction ?? `txn_${Date.now()}`,
        order: `ord_${Date.now()}`,
      },
      receipt: { email: true, sms: false },
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: req.customerEmail,
      },
      source: { id: "src_all" },
      post: { url: req.postUrl },
      redirect: { url: req.redirectUrl },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      `Tap API error ${res.status}: ${(err as { message?: string }).message ?? JSON.stringify(err)}`
    );
  }

  return res.json() as Promise<TapChargeResponse>;
}

// Tap webhook signature verification.
// Tap computes the hashstring as HMAC-SHA256 of sorted top-level primitive fields
// (excluding "hashstring" itself) concatenated as "key1value1key2value2..." using
// the webhook secret key (no separator between pairs).
// Ref: https://developers.tap.company/reference/webhook-signing
export async function verifyTapWebhook(
  body: Record<string, unknown>,
  hashstring: string
): Promise<boolean> {
  const secret = process.env.TAP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[tap] TAP_WEBHOOK_SECRET not set — skipping signature verification (dev only)");
    return true;
  }
  if (!hashstring) return false;

  const message = Object.entries(body)
    .filter(
      ([k, v]) =>
        k !== "hashstring" &&
        (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}${v}`)
    .join("");

  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex === hashstring;
}
