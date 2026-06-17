import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BroadcastsView } from "@/components/whatsapp/broadcasts-view";

export const metadata: Metadata = { title: "WhatsApp Broadcasts — Maktaby" };
export const dynamic = "force-dynamic";

export default async function WhatsAppBroadcastsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;

  const [broadcasts, templates, plans, audienceCount] = await Promise.all([
    prisma.whatsAppBroadcast.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.whatsAppTemplate.findMany({
      where: { organizationId: orgId, deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, body: true, language: true },
    }),
    prisma.membershipPlan.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.member.count({
      where: { organizationId: orgId, deletedAt: null, status: "ACTIVE", whatsAppNumber: { not: null } },
    }),
  ]);

  return (
    <BroadcastsView
      broadcasts={broadcasts as any}
      templates={templates as any}
      plans={plans as any}
      audienceCount={audienceCount}
    />
  );
}
