import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isAdminRole, type AppRole } from "@/lib/permissions";

/**
 * Authenticated user for the current request.
 *
 * Wrapped in React `cache()` so that no matter how many times a layout,
 * page, and its children call it during a single render pass, the
 * Supabase auth check runs exactly ONCE. Previously the dashboard layout
 * AND the page each called `getUser()` independently — two network calls
 * to the Supabase auth server (Sydney) per navigation.
 */
export const getCurrentUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type AuthContext = {
  user: { id: string; email: string; name: string | null; avatar: string | null };
  organizationId: string;
  role: AppRole;
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: "STARTER" | "GROWTH" | "PRO" | "ENTERPRISE";
    currency: string;
    jurisdiction: "UAE" | "KSA";
    timezone: string;
    trialEndsAt: Date | null;
    platformSubscriptionStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED" | null;
    businessType: string | null;
  };
};

/**
 * Resolves the current user AND their active organization in a single
 * cached call. Replaces the repeated
 *   `getUser()` + `userOrganization.findFirst()`
 * pattern that ran in both the layout and every page. With `cache()`,
 * the layout's lookup is reused by the page for free (cache hit).
 *
 * Returns `null` when unauthenticated or not a member of any org —
 * callers decide where to redirect.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      organizationId: true,
      role: true,
      user: { select: { name: true, avatar: true } },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          currency: true,
          jurisdiction: true,
          timezone: true,
          trialEndsAt: true,
          businessType: true,
          platformSubscription: { select: { status: true } },
        },
      },
    },
  });

  if (!userOrg) return null;

  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      name: userOrg.user.name,
      avatar: userOrg.user.avatar,
    },
    organizationId: userOrg.organizationId,
    role: userOrg.role,
    organization: {
      ...userOrg.organization,
      platformSubscriptionStatus: userOrg.organization.platformSubscription?.status ?? null,
      businessType: userOrg.organization.businessType ?? null,
    },
  };
});

/**
 * Lightweight org-id resolver.
 *
 * The DB lives in a distant region (~1s round-trip), and this lookup
 * runs on every API call. A user's org membership almost never changes,
 * so we keep a short-lived server-side cache (safe: server memory only,
 * never client-controllable, so multi-tenant isolation is preserved).
 * This removes a ~1s round-trip from every authenticated API request
 * after the first. Wrapped in React `cache()` for per-request dedupe too.
 */
type CachedOrg = { orgId: string | null; role: AppRole | null; exp: number };
const _orgIdCache = new Map<string, CachedOrg>();
const ORG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const _resolveOrg = cache(async (userId: string): Promise<CachedOrg> => {
  const hit = _orgIdCache.get(userId);
  if (hit && hit.exp > Date.now()) return hit;

  const uo = await prisma.userOrganization.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true, role: true },
  });
  const entry: CachedOrg = {
    orgId: uo?.organizationId ?? null,
    role: uo?.role ?? null,
    exp: Date.now() + ORG_CACHE_TTL,
  };
  _orgIdCache.set(userId, entry);
  return entry;
});

export const getOrgIdForUser = cache(async (userId: string) => {
  return (await _resolveOrg(userId)).orgId;
});

/**
 * Fast auth resolver for API routes.
 *
 * Uses `getSession()` (reads + decodes the JWT from the request cookie,
 * NO network call) instead of `getUser()` (a network round-trip to
 * Supabase Auth on every request). The middleware already calls
 * `getUser()` and validates the session on every request before the
 * route runs, so trusting the cookie session here is safe — and it
 * removes the single biggest source of API latency (previously ~seconds
 * per call for the calendar, which re-fetches on every navigation).
 *
 * Returns `{ userId, organizationId }` or `null` if unauthenticated /
 * not in an org.
 */
export type ApiAuth = {
  userId: string;
  organizationId: string;
  role: AppRole;
};

export const getApiAuth = cache(async (): Promise<ApiAuth | null> => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  const { orgId, role } = await _resolveOrg(userId);
  if (!orgId || !role) return null;
  return { userId, organizationId: orgId, role };
});

/**
 * Admin-only API guard. Returns the auth context for OWNER/ADMIN, or `null`
 * for unauthenticated users AND for MEMBERs. Admin API routes must call this
 * and return 403/401 on null so a member can never read or mutate org-wide
 * data (other members, invoices, analytics, settings) by hitting the API
 * directly — the UI guard alone is not enough.
 */
export const requireAdminApi = cache(async (): Promise<ApiAuth | null> => {
  const auth = await getApiAuth();
  // Operational-admin roles only (OWNER/ADMIN/MANAGER). RECEPTIONIST and
  // PRO_AGENT are staff but must NOT reach the shared admin API — they get
  // scoped access through their own module routes.
  if (!auth || !isAdminRole(auth.role)) return null;
  return auth;
});

/** Owner-only API guard (platform billing and other owner-restricted actions). */
export const requireOwnerApi = cache(async (): Promise<ApiAuth | null> => {
  const auth = await getApiAuth();
  if (!auth || auth.role !== "OWNER") return null;
  return auth;
});
