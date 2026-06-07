import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { inviteMemberSchema } from "@/lib/validations";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
import { sendMemberInvite } from "@/lib/email";
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
  if (ctx.role === "MEMBER") return apiError("Forbidden", 403);

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
  if (ctx.role === "MEMBER") return apiError("Forbidden", 403);

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

  // Use the admin client (service role key) so auth.admin methods are available
  const supabaseAdmin = createAdminClient();

  // Generate a Supabase invite link — this creates the auth account without
  // sending Supabase's default email. We send our own branded email via Resend.
  // For users already in Supabase auth (e.g. re-inviting an owner as a member)
  // fall back to a magic link.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = `${appUrl}/auth-callback`;

  let { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { name }, redirectTo },
  });

  if (linkErr && linkErr.message.includes("already been registered")) {
    ({ data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    }));
  }

  if (linkErr) {
    console.error("[invite] generateLink failed:", linkErr.message);
    // Fall through — still create the DB record; member can use "Forgot password" to access.
  }

  // Create User + Member record in our DB, using the Supabase-generated user id
  const userId = linkData?.user?.id ?? crypto.randomUUID();

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
        status: "ACTIVE",
        startDate: new Date(),
      },
      include: { user: true, membershipPlan: true, organization: { select: { name: true } } },
    });
  });

  // Build the invite link ourselves using hashed_token — this goes directly
  // to our /auth-callback page without touching Supabase's redirect system,
  // so no "allowed redirect URLs" config is needed in Supabase dashboard.
  const hashedToken = linkData?.properties?.hashed_token;
  const verificationType = linkData?.properties?.verification_type ?? "invite";

  if (hashedToken) {
    const inviteLink = `${appUrl}/auth-callback?token_hash=${hashedToken}&type=${verificationType}`;
    sendMemberInvite({
      to: email,
      memberName: name,
      orgName: member.organization.name,
      inviteLink,
    });
  }

  return apiSuccess(member, 201);
}
