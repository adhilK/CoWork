import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jobsEnabled } from "@/lib/jobs";
import { AutomationsView } from "@/components/automations/automations-view";

export const metadata: Metadata = { title: "Automations — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Recent automated activity, grouped by message type (last 7 days, outbound).
  const recent = await prisma.whatsAppMessage.groupBy({
    by: ["messageType"],
    where: { organizationId: orgId, direction: "OUTBOUND", sentAt: { gte: weekAgo } },
    _count: true,
  });

  const activity: Record<string, number> = {};
  for (const r of recent) activity[r.messageType] = r._count;

  // Upcoming counts the reminders engine would act on (next 30 days).
  const horizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const [visaSoon, docsSoon, voRenewals, overdueReqs] = await Promise.all([
    prisma.member.count({ where: { organizationId: orgId, deletedAt: null, status: "ACTIVE", visaExpiry: { not: null, gte: now, lte: horizon } } }),
    prisma.document.count({ where: { organizationId: orgId, deletedAt: null, expiryDate: { not: null, gte: now, lte: horizon } } }),
    prisma.virtualOfficeSubscription.count({ where: { organizationId: orgId, deletedAt: null, status: { in: ["ACTIVE", "PENDING_RENEWAL"] }, renewalDate: { not: null, gte: now, lte: horizon } } }),
    prisma.documentRequest.count({ where: { organizationId: orgId, deletedAt: null, status: { in: ["PENDING", "OVERDUE"] }, dueDate: { not: null, lt: now } } }),
  ]);

  return (
    <AutomationsView
      inngestConnected={jobsEnabled()}
      activity={activity}
      upcoming={{ visaSoon, docsSoon, voRenewals, overdueReqs }}
    />
  );
}
