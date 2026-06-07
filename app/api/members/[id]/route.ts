import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
  membershipPlanId: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const member = await prisma.member.findFirst({
    where: { id: params.id, organizationId: orgId, deletedAt: null },
  });
  if (!member) return apiError("Member not found", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const d = parsed.data;

  // Validate plan belongs to org if provided
  if (d.membershipPlanId) {
    const plan = await prisma.membershipPlan.findFirst({
      where: { id: d.membershipPlanId, organizationId: orgId },
    });
    if (!plan) return apiError("Plan not found", 404);
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (d.name !== undefined) {
      await tx.user.update({ where: { id: member.userId }, data: { name: d.name } });
    }
    return tx.member.update({
      where: { id: params.id },
      data: {
        ...(d.phone !== undefined && { phone: d.phone }),
        ...(d.company !== undefined && { company: d.company }),
        ...(d.jobTitle !== undefined && { jobTitle: d.jobTitle }),
        ...(d.bio !== undefined && { bio: d.bio }),
        ...(d.notes !== undefined && { notes: d.notes }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.membershipPlanId !== undefined && { membershipPlanId: d.membershipPlanId }),
      },
      include: { user: true, membershipPlan: true },
    });
  });

  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const member = await prisma.member.findFirst({
    where: { id: params.id, organizationId: orgId, deletedAt: null },
  });
  if (!member) return apiError("Member not found", 404);

  // Soft delete (never hard delete — per conventions)
  await prisma.member.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: "INACTIVE" },
  });
  return apiSuccess({ success: true });
}
