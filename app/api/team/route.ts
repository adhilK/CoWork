import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getApiAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { assignableRoles, ROLE_LABELS, can } from "@/lib/permissions";
import { sendStaffInvite } from "@/lib/email";
import { z } from "zod";

// Team management is OWNER/ADMIN only ("settings" capability).
async function requireTeamManager() {
  const auth = await getApiAuth();
  if (!auth || !can(auth.role, "settings")) return null;
  return auth;
}

export async function GET(_req: NextRequest) {
  const auth = await requireTeamManager();
  if (!auth) return apiError("Forbidden", 403);

  const staff = await prisma.userOrganization.findMany({
    where: { organizationId: auth.organizationId, role: { not: "MEMBER" } },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  });

  return apiSuccess({
    data: staff.map((s) => ({
      userId: s.userId,
      name: s.user.name,
      email: s.user.email,
      avatar: s.user.avatar,
      role: s.role,
      isSelf: s.userId === auth.userId,
      createdAt: s.createdAt,
    })),
    actorRole: auth.role,
  });
}

const inviteSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  role: z.enum(["ADMIN", "MANAGER", "RECEPTIONIST", "PRO_AGENT"]),
});

export async function POST(req: NextRequest) {
  const auth = await requireTeamManager();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const { name, email, role } = parsed.data;

  // The actor may only assign roles at or below their own authority.
  if (!assignableRoles(auth.role).includes(role)) {
    return apiError("You can't assign that role", 403);
  }

  // Already a member of this org?
  const existing = await prisma.user.findFirst({
    where: { email },
    include: { organizations: { where: { organizationId: auth.organizationId } } },
  });
  if (existing?.organizations?.length) {
    return apiError("This person is already part of your organization", 409);
  }

  const supabaseAdmin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = `${appUrl}/auth-callback`;

  // Provision the auth account via an invite link (branded email sent by us).
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
    console.error("[team invite] generateLink failed:", linkErr.message);
  }

  const userId = linkData?.user?.id ?? crypto.randomUUID();

  const org = await prisma.$transaction(async (tx) => {
    const dbUser = await tx.user.upsert({
      where: { email },
      create: { id: userId, email, name },
      update: { name },
    });
    await tx.userOrganization.upsert({
      where: { userId_organizationId: { userId: dbUser.id, organizationId: auth.organizationId } },
      create: { userId: dbUser.id, organizationId: auth.organizationId, role },
      update: { role },
    });
    return tx.organization.findUnique({ where: { id: auth.organizationId }, select: { name: true } });
  });

  const hashedToken = linkData?.properties?.hashed_token;
  const verificationType = linkData?.properties?.verification_type ?? "invite";
  if (hashedToken && org) {
    const inviteLink = `${appUrl}/auth-callback?token_hash=${hashedToken}&type=${verificationType}`;
    sendStaffInvite({
      to: email,
      staffName: name,
      orgName: org.name,
      roleLabel: ROLE_LABELS[role],
      inviteLink,
    });
  }

  return apiSuccess({ userId, name, email, role }, 201);
}
