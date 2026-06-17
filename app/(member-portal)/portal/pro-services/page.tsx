import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MemberProServicesView } from "@/components/pro-services/member-pro-services-view";

export const metadata: Metadata = { title: "My PRO Services — Maktaby" };
export const dynamic = "force-dynamic";

export default async function PortalProServicesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, organizationId: true },
  });
  if (!member) redirect("/login");

  const requests = await prisma.proServiceRequest.findMany({
    where: { memberId: member.id, organizationId: member.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      // Only client-visible activities reach the member.
      activities: { where: { isClientVisible: true }, orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <MemberProServicesView
      requests={requests.map((r) => ({
        id: r.id,
        serviceType: r.serviceType,
        serviceDescription: r.serviceDescription,
        jurisdiction: r.jurisdiction,
        stage: r.stage,
        urgency: r.urgency,
        governingBody: r.governingBody,
        referenceNumber: r.referenceNumber,
        fee: r.fee == null ? null : Number(r.fee),
        currency: r.currency,
        dueDate: r.dueDate?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
        clientNotes: r.clientNotes,
        createdAt: r.createdAt.toISOString(),
        activities: r.activities.map((a) => ({ id: a.id, note: a.note, createdAt: a.createdAt.toISOString() })),
      })) as any}
    />
  );
}
