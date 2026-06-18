import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { createConnectedAccount, isWafeqConfigured } from "@/lib/zatca/wafeq";

export async function POST(_req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  if (auth.role !== "OWNER") return apiError("Only the workspace owner can connect to Wafeq", 403);

  if (!isWafeqConfigured()) {
    return apiError("WAFEQ_API_KEY is not configured. Set it in your environment variables.", 503);
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: {
      name: true,
      taxRegistrationNumber: true,
      zatcaVatNumber: true,
      zatcaCrNumber: true,
      zatcaAddress: true,
      wafeqAccountId: true,
    },
  });
  if (!org) return apiError("Organization not found", 404);

  // Idempotent — return existing account if already connected.
  if (org.wafeqAccountId) {
    return apiSuccess({ accountId: org.wafeqAccountId, alreadyConnected: true });
  }

  const vatNumber = org.zatcaVatNumber ?? org.taxRegistrationNumber;
  if (!vatNumber) {
    return apiError("A VAT registration number is required before connecting to Wafeq. Add it in ZATCA Settings → Business Details.", 422);
  }

  try {
    const account = await createConnectedAccount({
      name: org.name,
      taxRegistrationNumber: vatNumber,
      zatcaCrNumber: org.zatcaCrNumber,
      zatcaAddress: org.zatcaAddress as { street?: string; city?: string; postalCode?: string } | null,
    });

    await prisma.organization.update({
      where: { id: auth.organizationId },
      data: { wafeqAccountId: account.id },
    });

    return apiSuccess({ accountId: account.id, alreadyConnected: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to Wafeq";
    return apiError(msg, 502);
  }
}
