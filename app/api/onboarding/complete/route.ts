/**
 * POST /api/onboarding/complete
 *
 * Single-shot setup endpoint for the onboarding wizard. Creates (or updates)
 * the organization profile, then provisions the first location, resources,
 * membership plans, and payment configuration — all in one call so the wizard
 * validates client-side and submits once at the end.
 *
 * Auth: the Supabase user (NOT requireAdminApi) — because a brand-new operator
 * arriving via the email-confirmation flow may not have an Organization yet.
 * This endpoint creates it if missing, then links the user as OWNER.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "date-fns";
import { z } from "zod";
import { encryptField } from "@/lib/encryption";
import { slugify } from "@/lib/utils";
import {
  resolveJurisdiction,
  JURISDICTION_CURRENCY,
  JURISDICTION_TIMEZONE,
} from "@/lib/jurisdiction";

// ── Slug uniqueness ───────────────────────────────────────────────────────────

async function generateUniqueSlug(baseName: string): Promise<string> {
  const base = slugify(baseName) || "space";
  const existing = await prisma.organization.findUnique({ where: { slug: base } });
  if (!existing) return base;
  for (let i = 0; i < 5; i++) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${base}-${suffix}`;
    const taken = await prisma.organization.findUnique({ where: { slug: candidate } });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now()}`;
}

// ── Validation ────────────────────────────────────────────────────────────────

const dayHoursSchema = z.object({
  open: z.string().optional(),
  close: z.string().optional(),
  closed: z.boolean().optional(),
});

const RESOURCE_TYPES = [
  "HOT_DESK",
  "DEDICATED_DESK",
  "PRIVATE_OFFICE",
  "MEETING_ROOM",
  "EVENT_SPACE",
  "VIRTUAL_OFFICE",
  "PHONE_BOOTH",
] as const;

const schema = z.object({
  space: z.object({
    name: z.string().min(2).max(100),
    businessType: z.string().max(60).optional().nullable(),
    jurisdiction: z.enum(["UAE", "KSA"]),
    city: z.string().max(80).optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    whatsappNumber: z.string().max(40).optional().nullable(),
  }),
  location: z.object({
    name: z.string().min(1).max(120),
    address: z.string().max(500).optional().nullable(),
    openingHours: z.record(z.string(), dayHoursSchema).optional().nullable(),
  }),
  resources: z
    .array(
      z.object({
        type: z.enum(RESOURCE_TYPES),
        quantity: z.number().int().min(1).max(1000),
        hourly: z.number().min(0).max(1_000_000).optional().nullable(),
        halfDay: z.number().min(0).max(1_000_000).optional().nullable(),
        fullDay: z.number().min(0).max(1_000_000).optional().nullable(),
        monthly: z.number().min(0).max(1_000_000).optional().nullable(),
      })
    )
    .max(20)
    .default([]),
  plans: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        type: z
          .enum(["DAY_PASS", "HOT_DESK", "DEDICATED_DESK", "PRIVATE_OFFICE", "VIRTUAL_OFFICE", "CUSTOM"])
          .default("CUSTOM"),
        price: z.number().min(0).max(1_000_000),
        billingCycle: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
        includedCredits: z.number().int().min(0).max(100000).default(0),
      })
    )
    .max(3)
    .default([]),
  payments: z
    .object({
      tapSecretKey: z.string().max(200).optional().nullable(),
      moyasarApiKey: z.string().max(200).optional().nullable(),
      bankTransfer: z
        .object({
          bankName: z.string().max(120),
          iban: z.string().max(60),
          accountName: z.string().max(120),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
});

// Friendly names per resource type.
const RESOURCE_LABELS: Record<(typeof RESOURCE_TYPES)[number], string> = {
  HOT_DESK: "Hot Desks",
  DEDICATED_DESK: "Dedicated Desks",
  PRIVATE_OFFICE: "Private Offices",
  MEETING_ROOM: "Meeting Rooms",
  EVENT_SPACE: "Event Space",
  VIRTUAL_OFFICE: "Virtual Office",
  PHONE_BOOTH: "Phone Booths",
};

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const jurisdiction = resolveJurisdiction(d.space.jurisdiction);
    const currency = JURISDICTION_CURRENCY[jurisdiction];
    const timezone = JURISDICTION_TIMEZONE[jurisdiction];

    const email = user.email ?? "";
    const name = (user.user_metadata?.name as string | undefined) ?? email.split("@")[0] ?? "User";

    // Ensure the User row exists (sequential — pgbouncer-safe, no $transaction).
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email, name },
      create: { id: user.id, email, name },
    });

    // ── Resolve or create the organization ──────────────────────────────────
    const existingLink = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    let orgId: string;

    if (existingLink) {
      // Org already exists (typical no-email-confirmation flow) — update profile.
      orgId = existingLink.organizationId;
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          name: d.space.name,
          businessType: d.space.businessType ?? null,
          jurisdiction,
          currency,
          timezone,
          phone: d.space.phone ?? null,
          whatsappNumber: d.space.whatsappNumber ?? null,
        },
      });
    } else {
      // No org yet (email-confirmation flow) — create it and link as OWNER.
      const finalSlug = await generateUniqueSlug(d.space.name);

      const org = await prisma.organization.create({
        data: {
          name: d.space.name,
          slug: finalSlug,
          email,
          businessType: d.space.businessType ?? null,
          timezone,
          currency,
          jurisdiction,
          phone: d.space.phone ?? null,
          whatsappNumber: d.space.whatsappNumber ?? null,
          plan: "STARTER",
          trialEndsAt: addDays(new Date(), 14),
        },
      });
      orgId = org.id;

      await prisma.platformSubscription
        .create({
          data: {
            organizationId: orgId,
            status: "TRIAL",
            plan: "STARTER",
            currency,
            trialEndsAt: addDays(new Date(), 14),
          },
        })
        .catch((e) => console.warn("[onboarding/complete] platformSubscription skipped:", e.message));

      await prisma.jurisdictionConfig
        .create({
          data: {
            organizationId: orgId,
            jurisdictions: [jurisdiction],
            primaryJurisdiction: jurisdiction,
          },
        })
        .catch((e) => console.warn("[onboarding/complete] jurisdictionConfig skipped:", e.message));

      await prisma.userOrganization.create({
        data: { userId: user.id, organizationId: orgId, role: "OWNER" },
      });
    }

    // ── 1. Location ───────────────────────────────────────────────────────────
    const location = await prisma.location.create({
      data: {
        organizationId: orgId,
        name: d.location.name,
        address: d.location.address ?? null,
        city: d.space.city ?? null,
        jurisdiction,
        timezone,
        openingHours: d.location.openingHours ?? undefined,
        isActive: true,
      },
    });

    // ── 2. Resources ──────────────────────────────────────────────────────────
    let resourcesCreated = 0;
    let voCreated = 0;

    for (const r of d.resources) {
      if (r.type === "VIRTUAL_OFFICE") {
        // Virtual office is a registered-address product, not a bookable resource.
        await prisma.virtualOfficeAddress.create({
          data: {
            organizationId: orgId,
            jurisdiction,
            addressLine: d.location.address || `${d.space.city ?? d.space.name} Registered Address`,
            addressType: jurisdiction === "KSA" ? "MAINLAND" : "FREEZONE",
            maxClients: Math.max(1, r.quantity) * 50,
            monthlyFee: r.monthly ?? 0,
            isActive: true,
          },
        });
        voCreated += 1;
        continue;
      }

      const data: Record<string, unknown> = {
        organizationId: orgId,
        locationId: location.id,
        name: RESOURCE_LABELS[r.type],
        type: r.type,
        capacity: Math.min(1000, Math.max(1, r.quantity)),
        isActive: true,
      };

      if (r.hourly != null) data.hourlyRate = r.hourly;
      if (r.halfDay != null) data.halfDayRate = r.halfDay;
      if (r.fullDay != null) data.fullDayRate = r.fullDay;
      if (r.monthly != null) data.monthlyRate = r.monthly;

      await prisma.resource.create({ data: data as any });
      resourcesCreated += 1;
    }

    // ── 3. Membership plans ───────────────────────────────────────────────────
    let plansCreated = 0;
    for (const p of d.plans) {
      await prisma.membershipPlan.create({
        data: {
          organizationId: orgId,
          name: p.name,
          type: p.type,
          price: p.price,
          billingCycle: p.billingCycle,
          includedCredits: p.includedCredits,
          isActive: true,
        },
      });
      plansCreated += 1;
    }

    // ── 4. Payments ───────────────────────────────────────────────────────────
    let paymentsConfigured = false;
    if (d.payments) {
      const tap = d.payments.tapSecretKey?.trim() || null;
      const moyasar = d.payments.moyasarApiKey?.trim() || null;
      const bank = d.payments.bankTransfer ?? null;

      const orgUpdate: Record<string, unknown> = {};
      if (tap) {
        orgUpdate.tapSecretKey = encryptField(tap);
        orgUpdate.paymentProvider = "TAP";
      }
      if (moyasar) {
        orgUpdate.moyasarApiKey = encryptField(moyasar);
        if (jurisdiction === "KSA") orgUpdate.paymentProvider = "MOYASAR";
      }
      if (bank && bank.bankName && bank.iban) {
        orgUpdate.bankTransferDetails = {
          bankName: bank.bankName,
          iban: bank.iban,
          accountName: bank.accountName,
        };
      }

      if (Object.keys(orgUpdate).length > 0) {
        await prisma.organization.update({ where: { id: orgId }, data: orgUpdate });
        paymentsConfigured = true;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        locationName: location.name,
        resourcesCreated,
        virtualOfficeCreated: voCreated,
        plansCreated,
        paymentsConfigured,
        jurisdiction,
        currency,
      },
    });
  } catch (error) {
    console.error("[POST /api/onboarding/complete]", error);
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 });
  }
}
