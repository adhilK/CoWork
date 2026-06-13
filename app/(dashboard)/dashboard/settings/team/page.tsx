import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, homePathForRole } from "@/lib/permissions";
import { TeamView } from "@/components/team/team-view";

export const metadata: Metadata = { title: "Team — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  // Team management is OWNER/ADMIN only.
  if (!can(ctx.role, "settings")) redirect(homePathForRole(ctx.role));

  const staff = await prisma.userOrganization.findMany({
    where: { organizationId: ctx.organizationId, role: { not: "MEMBER" } },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <TeamView
      actorRole={ctx.role}
      actorUserId={ctx.user.id}
      initialStaff={staff.map((s) => ({
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        avatar: s.user.avatar,
        role: s.role,
        isSelf: s.userId === ctx.user.id,
      })) as any}
    />
  );
}
