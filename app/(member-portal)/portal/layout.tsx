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

  // Feature flags — only show portal sections where there is relevant data for this member.
  const [proCount, bsCount] = await Promise.all([
    prisma.proServiceRequest.count({ where: { memberId: member.id, deletedAt: null } }),
    prisma.businessSetupLead.count({ where: { memberId: member.id, deletedAt: null } }),
  ]);

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
      showProServices={proCount > 0}
      showBusinessSetup={bsCount > 0}
    >
      {children}
    </PortalShell>
  );
}
