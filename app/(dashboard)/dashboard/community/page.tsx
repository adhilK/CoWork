import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CommunityView } from "@/components/community/community-view";

export const metadata: Metadata = { title: "Community — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const userOrg = { organizationId: ctx.organizationId };

  const [announcements, events] = await Promise.all([
    prisma.announcement.findMany({
      where: { organizationId: userOrg.organizationId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    }),
    prisma.event.findMany({
      where: { organizationId: userOrg.organizationId },
      orderBy: { startTime: "asc" },
    }),
  ]);

  return (
    <CommunityView
      initialAnnouncements={announcements as any}
      initialEvents={events as any}
    />
  );
}
