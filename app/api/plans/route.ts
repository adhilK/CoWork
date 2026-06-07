import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

// Admin-only endpoint: membership plans are managed by operators.
async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true, role: true } });
  if (!uo || uo.role === "MEMBER") return null;
  return uo.organizationId;
}

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["DAY_PASS", "HOT_DESK", "DEDICATED_DESK", "PRIVATE_OFFICE", "VIRTUAL_OFFICE", "CUSTOM"]),
  price: z.number().positive(),
  billingCycle: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  includedCredits: z.number().int().min(0).default(0),
  meetingRoomHours: z.number().int().min(0).default(0),
  features: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const plans = await prisma.membershipPlan.findMany({
    where: { organizationId: orgId },
    include: { _count: { select: { members: true } } },
    orderBy: { price: "asc" },
  });
  return apiSuccess(plans);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const plan = await prisma.membershipPlan.create({
    data: { organizationId: orgId, ...parsed.data },
  });
  return apiSuccess(plan, 201);
}
