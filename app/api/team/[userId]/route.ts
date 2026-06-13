import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { assignableRoles, canManageTarget, can } from "@/lib/permissions";
import { z } from "zod";

async function requireTeamManager() {
  const auth = await getApiAuth();
  if (!auth || !can(auth.role, "settings")) return null;
  return auth;
}

const updateSchema = z.object({
  role: z.enum(["ADMIN", "MANAGER", "RECEPTIONIST", "PRO_AGENT"]),
});

export async function PATCH(req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireTeamManager();
  if (!auth) return apiError("Forbidden", 403);

  if (params.userId === auth.userId) return apiError("You can't change your own role", 400);

  const target = await prisma.userOrganization.findFirst({
    where: { userId: params.userId, organizationId: auth.organizationId },
  });
  if (!target) return apiError("Team member not found", 404);

  if (!canManageTarget(auth.role, target.role)) {
    return apiError("You can't manage this team member", 403);
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const { role } = parsed.data;

  if (!assignableRoles(auth.role).includes(role)) {
    return apiError("You can't assign that role", 403);
  }

  const updated = await prisma.userOrganization.update({
    where: { userId_organizationId: { userId: params.userId, organizationId: auth.organizationId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });

  return apiSuccess({ userId: updated.userId, name: updated.user.name, email: updated.user.email, role: updated.role });
}

export async function DELETE(_req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireTeamManager();
  if (!auth) return apiError("Forbidden", 403);

  if (params.userId === auth.userId) return apiError("You can't remove yourself", 400);

  const target = await prisma.userOrganization.findFirst({
    where: { userId: params.userId, organizationId: auth.organizationId },
  });
  if (!target) return apiError("Team member not found", 404);

  if (!canManageTarget(auth.role, target.role)) {
    return apiError("You can't remove this team member", 403);
  }

  // Revoke org access. We keep the auth user + User row (they may belong to
  // other orgs); only their membership of THIS org is removed.
  await prisma.userOrganization.delete({
    where: { userId_organizationId: { userId: params.userId, organizationId: auth.organizationId } },
  });

  return apiSuccess({ success: true });
}
