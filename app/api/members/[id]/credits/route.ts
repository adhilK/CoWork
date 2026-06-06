import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  // Positive to add, negative to deduct
  delta: z.number().int(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getApiAuth();
  if (!auth) return apiError("Unauthorized", 401);
  const orgId = auth.organizationId;

  const member = await prisma.member.findFirst({
    where: { id: params.id, organizationId: orgId, deletedAt: null },
  });
  if (!member) return apiError("Member not found", 404);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const newBalance = member.credits + parsed.data.delta;
  if (newBalance < 0) return apiError("Cannot deduct more credits than the member has", 400);

  const updated = await prisma.member.update({
    where: { id: params.id },
    data: { credits: newBalance },
    include: { user: true, membershipPlan: true },
  });

  return apiSuccess(updated);
}
