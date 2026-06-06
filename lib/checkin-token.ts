import crypto from "crypto";

/**
 * Per-booking check-in token (HMAC). Lets us build QR check-in WITHOUT a
 * schema change: the token is derived from the booking id + a server
 * secret, so it can be recomputed and verified on the public check-in
 * route. Anyone holding the QR (the member, or the front-desk display)
 * can check that one booking in — which is exactly the intent.
 */
const SECRET =
  process.env.CHECKIN_SECRET ?? process.env.CRON_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-checkin-secret";

export function checkinToken(bookingId: string): string {
  return crypto.createHmac("sha256", SECRET).update(bookingId).digest("base64url").slice(0, 24);
}

export function verifyCheckinToken(bookingId: string, token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = checkinToken(bookingId);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function checkinUrl(bookingId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/checkin/${bookingId}?t=${checkinToken(bookingId)}`;
}
