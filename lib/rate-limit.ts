/**
 * Lightweight in-memory rate limiter (fixed-window).
 *
 * No external dependency (no Redis/Upstash). State lives in module memory, so
 * on serverless it is per-instance: a determined attacker hitting many cold
 * instances can exceed the nominal limit, but it still removes the cheap
 * single-instance flood/abuse vector and protects unauthenticated endpoints
 * (public booking, password reset, register, payment checkout). Swap the store
 * for Redis when horizontal precision is needed.
 *
 * Usage in a route handler:
 *
 *   const limit = rateLimit(req, { key: "public-book", limit: 10, windowMs: 60_000 });
 *   if (!limit.ok) return rateLimitResponse(limit);
 */

import { NextResponse } from "next/server";

// Accept any request-like object exposing headers (NextRequest or the plain
// Request passed to some route handlers).
type RequestLike = { headers: Headers };

type Bucket = { count: number; resetAt: number };

// Map<bucketKey, Bucket>. Pruned lazily on access.
const store = new Map<string, Bucket>();

// Bound memory: if the map grows very large (many distinct IPs), drop expired
// entries. Cheap and runs only past a threshold.
function maybePrune(now: number) {
  if (store.size < 5000) return;
  const expired: string[] = [];
  store.forEach((b, k) => {
    if (b.resetAt <= now) expired.push(k);
  });
  expired.forEach((k) => store.delete(k));
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: RequestLike): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitOptions = {
  /** Logical bucket name, e.g. "public-book". Combined with the client IP. */
  key: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Override the identity (defaults to client IP). */
  identifier?: string;
};

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export function rateLimit(req: RequestLike, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  maybePrune(now);

  const id = opts.identifier ?? clientIp(req);
  const bucketKey = `${opts.key}:${id}`;

  const existing = store.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    store.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, limit: opts.limit, remaining: opts.limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, opts.limit - existing.count);
  const ok = existing.count <= opts.limit;
  return {
    ok,
    limit: opts.limit,
    remaining,
    retryAfter: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Standard 429 response with Retry-After + RateLimit headers. */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "RateLimit-Limit": String(result.limit),
        "RateLimit-Remaining": String(result.remaining),
      },
    }
  );
}
