import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

const updateAddressSchema = z.object({
  addressLine: z.string().min(1).max(500).optional(),
  addressType: z.enum(["MAINLAND", "FREEZONE", "OFFSHORE", "PREMIUM_BUSINESS_DISTRICT"]).optional(),
  jurisdiction: z.enum(["UAE", "KSA"]).optional(),
  freezoneName: z.string().max(100).optional().nullable(),
  ejariNumber: z.string().max(50).optional().nullable(),
  maxClients: z.number().int().min(1).max(9999).optional(),
  monthlyFee: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const address = await prisma.virtualOfficeAddress.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!address) return apiError("Address not found", 404);

  const body = await req.json();
  const parsed = updateAddressSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const updated = await prisma.virtualOfficeAddress.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const address = await prisma.virtualOfficeAddress.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!address) return apiError("Address not found", 404);

  // Check no active subscriptions before deleting
  const activeCount = await prisma.virtualOfficeSubscription.count({
    where: { addressId: params.id, status: "ACTIVE", deletedAt: null },
  });
  if (activeCount > 0) return apiError("Cannot delete address with active subscriptions", 409);

  await prisma.virtualOfficeAddress.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  return apiSuccess({ success: true });
}
