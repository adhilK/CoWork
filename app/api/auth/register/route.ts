import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function getClientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip") ?? null;
}

export async function POST(request: Request) {
  // Throttle org creation per IP to curb automated signup abuse.
  const limit = rateLimit(request, { key: "register", limit: 10, windowMs: 60 * 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const { userId, name, email, orgName, orgSlug, orgTimezone, orgCurrency, orgJurisdiction } =
      await request.json();

    // GCC jurisdiction — default UAE (Phase 1 primary market)
    const jurisdiction = orgJurisdiction === "KSA" ? "KSA" : "UAE";

    // Unique slug — try the base, then random 4-char suffixes, then timestamp fallback.
    const baseSlug = orgSlug || "space";
    let finalSlug = baseSlug;
    const existingBase = await prisma.organization.findUnique({ where: { slug: baseSlug } });
    if (existingBase) {
      let found = false;
      for (let i = 0; i < 5; i++) {
        const suffix = Math.random().toString(36).slice(2, 6);
        const candidate = `${baseSlug}-${suffix}`;
        const taken = await prisma.organization.findUnique({ where: { slug: candidate } });
        if (!taken) { finalSlug = candidate; found = true; break; }
      }
      if (!found) finalSlug = `${baseSlug}-${Date.now()}`;
    }

    // Sequential operations — no $transaction() (pgbouncer incompatible)
    await prisma.user.upsert({
      where: { id: userId },
      update: { email, name },
      create: { id: userId, email, name },
    });

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: finalSlug,
        email,
        timezone: orgTimezone ?? "Asia/Dubai",
        currency: orgCurrency ?? "AED",
        jurisdiction,
        plan: "STARTER",
        trialEndsAt: addDays(new Date(), 14),
      },
    });

    // Platform subscription — start every new org on a 14-day trial.
    await prisma.platformSubscription.create({
      data: {
        organizationId: org.id,
        status: "TRIAL",
        plan: "STARTER",
        currency: jurisdiction === "KSA" ? "SAR" : "AED",
        trialEndsAt: addDays(new Date(), 14),
      },
    }).catch((e) => console.warn("[register] platformSubscription create skipped:", e.message));

    // Jurisdiction config (VAT rates, currencies, toggles). Non-critical —
    // a failure here must not block onboarding; the org.jurisdiction field
    // alone is enough for VAT until the operator opens jurisdiction settings.
    await prisma.jurisdictionConfig.create({
      data: {
        organizationId: org.id,
        jurisdictions: [jurisdiction],
        primaryJurisdiction: jurisdiction,
      },
    }).catch((e) => console.warn("[register] jurisdictionConfig create skipped:", e.message));

    await prisma.userOrganization.create({
      data: { userId, organizationId: org.id, role: "OWNER" },
    });

    // PDPL consent: log data-processing consent at registration.
    // The user implicitly consents to data processing by creating an account.
    await prisma.consentLog.create({
      data: {
        userId,
        organizationId: org.id,
        consentType: "DATA_PROCESSING",
        consentGiven: true,
        ipAddress: getClientIp(request),
        userAgent: request.headers.get("user-agent") ?? null,
        version: "1.0",
      },
    }).catch((e: unknown) => console.warn("[register] consentLog create skipped:", (e as Error).message));

    // NOTE: the first location is created by the onboarding wizard
    // (POST /api/onboarding/complete), not here — a location-less org is the
    // signal that setup is still pending, which routes the user into /onboarding.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
