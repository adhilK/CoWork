import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { inviteMemberSchema } from "@/lib/validations";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
import { addDays } from "date-fns";

async function getOrgContext(userId: string) {
  return prisma.userOrganization.findFirst({
    where: { userId },
    select: { organizationId: true, role: true },
  });
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const ctx = await getOrgContext(user.id);
  if (!ctx) return apiError("No organization", 403);

  const sp = req.nextUrl.searchParams;
  const search = sp.get("search")?.trim();
  const status = sp.get("status");
  const { page, limit, skip } = getPaginationParams(sp);

  const where = {
    organizationId: ctx.organizationId,
    deletedAt: null,
    ...(status && status !== "all" && { status: status as any }),
    ...(search && {
      OR: [
        { user: { name: { contains: search, mode: "insensitive" as const } } },
        { user: { email: { contains: search, mode: "insensitive" as const } } },
        { company: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: { user: true, membershipPlan: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.member.count({ where }),
  ]);

  return apiSuccess({ data: members, meta: buildPaginationMeta(total, page, limit) });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const ctx = await getOrgContext(user.id);
  if (!ctx) return apiError("No organization", 403);

  const body = await req.json();
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { name, email, company, jobTitle, membershipPlanId, phone } = parsed.data;

  // Check email uniqueness within org
  const existing = await prisma.user.findFirst({
    where: { email },
    include: { organizations: { where: { organizationId: ctx.organizationId } } },
  });
  if (existing?.organizations?.length) return apiError("Member with this email already exists", 409);

  // Send Supabase invite
  const { data: inviteData, error: inviteErr } = await supabase.auth.admin?.inviteUserByEmail?.(email, {
    data: { name, organizationId: ctx.organizationId },
  }) ?? {};

  // Create User + Member record (works even if invite API not available)
  const userId = inviteData?.user?.id ?? crypto.randomUUID();

  const member = await prisma.$transaction(async (tx) => {
    const dbUser = await tx.user.upsert({
      where: { email },
      create: { id: userId, email, name },
      update: { name },
    });

    await tx.userOrganization.upsert({
      where: { userId_organizationId: { userId: dbUser.id, organizationId: ctx.organizationId } },
      create: { userId: dbUser.id, organizationId: ctx.organizationId, role: "MEMBER" },
      update: {},
    });

    return tx.member.create({
      data: {
        organizationId: ctx.organizationId,
        userId: dbUser.id,
        membershipPlanId: membershipPlanId ?? null,
        company: company ?? null,
        jobTitle: jobTitle ?? null,
        phone: phone ?? null,
        status: "PENDING",
        startDate: new Date(),
      },
      include: { user: true, membershipPlan: true },
    });
  });

  return apiSuccess(member, 201);
}
