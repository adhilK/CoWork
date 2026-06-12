import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { ZATCA_API_URL, ZATCA_SANDBOX_URL } from "@/lib/zatca";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const [org, config] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: auth.organizationId },
      select: { jurisdiction: true, taxRegistrationNumber: true, name: true },
    }),
    prisma.jurisdictionConfig.findUnique({
      where: { organizationId: auth.organizationId },
      select: { zatcaEnabled: true, arabicInvoices: true },
    }),
  ]);

  return apiSuccess({
    jurisdiction: org?.jurisdiction ?? "UAE",
    vatNumber: org?.taxRegistrationNumber ?? null,
    sellerName: org?.name ?? null,
    zatcaEnabled: config?.zatcaEnabled ?? false,
    arabicInvoices: config?.arabicInvoices ?? false,
    // Phase-2 middleware configured? (Phase 1 needs no env.)
    providerConfigured: !!(ZATCA_API_URL || ZATCA_SANDBOX_URL),
  });
}

const updateSchema = z.object({
  zatcaEnabled: z.boolean().optional(),
  arabicInvoices: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  if (auth.role !== "OWNER") return apiError("Only the owner can change ZATCA settings", 403);
  const orgId = auth.organizationId;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { jurisdiction: true },
  });

  // Upsert the JurisdictionConfig row (may not exist yet).
  const config = await prisma.jurisdictionConfig.upsert({
    where: { organizationId: orgId },
    update: { ...parsed.data },
    create: {
      organizationId: orgId,
      jurisdictions: org?.jurisdiction ? [org.jurisdiction] : [],
      primaryJurisdiction: org?.jurisdiction ?? "UAE",
      ...parsed.data,
    },
    select: { zatcaEnabled: true, arabicInvoices: true },
  });

  return apiSuccess(config);
}
