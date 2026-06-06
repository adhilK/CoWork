import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { orgName, orgSlug } = await request.json();
    if (!orgName || !orgSlug) {
      return NextResponse.json({ error: "orgName and orgSlug are required" }, { status: 400 });
    }

    const email = user.email ?? "";
    const name = user.user_metadata?.name ?? email.split("@")[0] ?? "User";

    // Remove any stale seed User row with same email but different ID
    const staleUser = await prisma.user.findFirst({
      where: { email, NOT: { id: user.id } },
    });
    if (staleUser) {
      await prisma.userOrganization.deleteMany({ where: { userId: staleUser.id } });
      await prisma.user.delete({ where: { id: staleUser.id } });
    }

    // Upsert the real User (sequential — no transaction, pgbouncer safe)
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email, name },
      create: { id: user.id, email, name },
    });

    // Idempotency check — if org already linked, return success
    const existingOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
    });
    if (existingOrg) {
      return NextResponse.json({ success: true });
    }

    // Unique slug
    const existingSlug = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    const finalSlug = existingSlug ? `${orgSlug}-${Date.now()}` : orgSlug;

    // Create org
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: finalSlug,
        email,
        timezone: "Europe/London",
        currency: "GBP",
        plan: "STARTER",
        trialEndsAt: addDays(new Date(), 14),
      },
    });

    // Link as OWNER
    await prisma.userOrganization.create({
      data: { userId: user.id, organizationId: org.id, role: "OWNER" },
    });

    // Default location (non-critical — failures won't block onboarding)
    await prisma.location.create({
      data: { organizationId: org.id, name: "Main Floor" },
    }).catch((e) => console.warn("[onboarding] location create skipped:", e.message));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/auth/complete-onboarding]", error);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}
