/**
 * GET /api/business-setup/renewals
 * Returns BusinessSetupApplications with licenseExpiry within the next 90 days.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessSetup } from "@/lib/business-setup/access";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(_req: NextRequest) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const now = new Date();
  const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const applications = await prisma.businessSetupApplication.findMany({
    where: {
      organizationId: auth.organizationId,
      licenseExpiry: { not: null, gte: now, lte: horizon },
      lead: { deletedAt: null },
    },
    orderBy: { licenseExpiry: "asc" },
    include: {
      lead: {
        select: {
          id: true,
          clientName: true,
          clientWhatsapp: true,
          companyName: true,
          licenseType: true,
          jurisdiction: true,
        },
      },
    },
  });

  return apiSuccess({
    renewals: applications.map((a) => ({
      applicationId: a.id,
      leadId: a.lead.id,
      clientName: a.lead.clientName,
      companyName: a.lead.companyName,
      licenseType: a.lead.licenseType,
      jurisdiction: a.lead.jurisdiction,
      licenseNumber: a.licenseNumber,
      licenseExpiry: a.licenseExpiry!.toISOString(),
      daysUntilExpiry: Math.ceil((a.licenseExpiry!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    })),
  });
}
