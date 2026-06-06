import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: {
      organization: { select: { name: true } },
      membershipPlan: { select: { name: true } },
      user: { select: { name: true, avatar: true, email: true } },
    },
  });

  if (!member) redirect("/login");

  return (
    <PortalShell
      member={{
        id: member.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        credits: member.credits,
        planName: member.membershipPlan?.name ?? null,
        orgName: member.organization.name,
      }}
    >
      {children}
    </PortalShell>
  );
}
