import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

const updateSubscriptionSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  licenseNumber: z.string().max(100).optional().nullable(),
  licenseExpiry: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  renewalDate: z.coerce.date().optional().nullable(),
  status: z.enum(["ACTIVE", "PENDING_RENEWAL", "EXPIRED", "CANCELLED"]).optional(),
  monthlyFee: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const subscription = await prisma.virtualOfficeSubscription.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!subscription) return apiError("Subscription not found", 404);

  const body = await req.json();
  const parsed = updateSubscriptionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const updated = await prisma.virtualOfficeSubscription.update({
    where: { id: params.id },
    data: parsed.data,
    include: {
      member: { include: { user: { select: { name: true, email: true } } } },
      address: { select: { id: true, addressLine: true, addressType: true } },
    },
  });

  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const subscription = await prisma.virtualOfficeSubscription.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!subscription) return apiError("Subscription not found", 404);

  await prisma.virtualOfficeSubscription.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: "CANCELLED" },
  });

  return apiSuccess({ success: true });
}
