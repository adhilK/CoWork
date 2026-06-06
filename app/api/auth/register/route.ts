import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";

export async function POST(request: Request) {
  try {
    const { userId, name, email, orgName, orgSlug, orgTimezone, orgCurrency } =
      await request.json();

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
        timezone: orgTimezone ?? "Europe/London",
        currency: orgCurrency ?? "GBP",
        plan: "STARTER",
        trialEndsAt: addDays(new Date(), 14),
      },
    });

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
