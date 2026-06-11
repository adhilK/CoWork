import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";

export async function POST(request: Request) {
  try {
    const { userId, name, email, orgName, orgSlug, orgTimezone, orgCurrency, orgJurisdiction } =
      await request.json();

    // GCC jurisdiction — default UAE (Phase 1 primary market)
    const jurisdiction = orgJurisdiction === "KSA" ? "KSA" : "UAE";

    // Unique slug
    const existing = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    const finalSlug = existing ? `${orgSlug}-${Date.now()}` : orgSlug;

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

    await prisma.location.create({
      data: { organizationId: org.id, name: "Main Floor" },
    }).catch((e) => console.warn("[register] location create skipped:", e.message));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
