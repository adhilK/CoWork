/**
 * POST /api/billing/checkout
 *
 * Creates a Dodo Payments hosted checkout session for the requested plan
 * and returns the checkout URL. Owner-only.
 */

import { NextResponse } from "next/server";
import { requireOwnerApi, getCurrentUser } from "@/lib/auth";
import { createCheckoutSession, isDodoEnabled } from "@/lib/dodo";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Plan } from "@prisma/client";

const schema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "PRO", "ENTERPRISE"]),
});

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDodoEnabled()) {
    return NextResponse.json(
      { error: "Payments not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (parsed.data.plan === "ENTERPRISE") {
    return NextResponse.json(
      { error: "Contact sales for Enterprise" },
      { status: 400 }
    );
  }

  try {
    // Get the user's email from the Supabase session (no extra DB hit)
    const supabaseUser = await getCurrentUser();
    const email = supabaseUser?.email ?? "";
    const name = supabaseUser?.user_metadata?.name as string | undefined;

    // Get the org's currency to select the right product ID
    const org = await prisma.organization.findUnique({
      where: { id: auth.organizationId },
      select: { currency: true },
    });
    const currency: "AED" | "SAR" =
      org?.currency === "SAR" ? "SAR" : "AED";

    const { checkoutUrl } = await createCheckoutSession(
      parsed.data.plan as Plan,
      auth.organizationId,
      email,
      currency,
      name
    );

    return NextResponse.json({ checkoutUrl });
  } catch (err) {
    console.error("[billing/checkout]", err);
    const msg = err instanceof Error ? err.message : "Checkout creation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
