import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { UAE_LICENSE_CATALOG } from "@/lib/license-catalog/uae";

/**
 * Import the built-in UAE license catalog into the org. Idempotent: skips any
 * template rows already present (matched by templateKey), so it can be run again
 * to pick up newly-added templates without duplicating existing ones.
 */
export async function POST(_req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const existing = await prisma.licenseCatalog.findMany({
    where: { organizationId: orgId, templateKey: { not: null } },
    select: { templateKey: true },
  });
  const have = new Set(existing.map((e) => e.templateKey));

  const toCreate = UAE_LICENSE_CATALOG.filter((t) => !have.has(t.templateKey));

  if (toCreate.length > 0) {
    await prisma.licenseCatalog.createMany({
      data: toCreate.map((t) => ({
        organizationId: orgId,
        jurisdiction: "UAE" as const,
        licenseType: t.licenseType,
        authority: t.authority,
        emirate: t.emirate,
        name: t.name,
        activityCategory: t.activityCategory,
        description: t.description,
        baseCost: t.baseCost,
        govFees: t.govFees,
        visaQuota: t.visaQuota,
        officeType: t.officeType,
        minShareCapital: t.minShareCapital ?? null,
        tenureYears: t.tenureYears,
        processingDays: t.processingDays,
        features: t.features,
        isPopular: t.isPopular ?? false,
        templateKey: t.templateKey,
      })),
    });
  }

  return apiSuccess({ imported: toCreate.length, skipped: UAE_LICENSE_CATALOG.length - toCreate.length });
}
