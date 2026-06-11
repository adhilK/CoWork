import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InboxView } from "@/components/whatsapp/inbox-view";

export const metadata: Metadata = { title: "WhatsApp — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function WhatsAppInboxPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;

  const [config, members, recentMessages] = await Promise.all([
    prisma.whatsAppConfig.findUnique({
      where: { organizationId: orgId },
      select: { isActive: true, displayNumber: true },
    }),
    prisma.member.findMany({
      where: { organizationId: orgId, deletedAt: null, whatsAppNumber: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, whatsAppNumber: true, user: { select: { name: true, email: true } } },
    }),
    prisma.whatsAppMessage.findMany({
      where: { organizationId: orgId },
      orderBy: { sentAt: "desc" },
      take: 1000,
      include: { member: { include: { user: { select: { name: true, email: true, avatar: true } } } } },
    }),
  ]);

  // Fold into conversations server-side for the initial paint.
  type Convo = {
    phone: string; memberId: string | null; memberName: string | null;
    memberEmail: string | null; memberAvatar: string | null; lastMessage: string;
    lastDirection: string; lastAt: string; lastStatus: string; unreadCount: number; totalCount: number;
  };
  const map = new Map<string, Convo>();
  for (const m of recentMessages) {
    const ex = map.get(m.phone);
    if (!ex) {
      map.set(m.phone, {
        phone: m.phone, memberId: m.memberId,
        memberName: m.member?.user.name ?? null, memberEmail: m.member?.user.email ?? null,
        memberAvatar: m.member?.user.avatar ?? null, lastMessage: m.content,
        lastDirection: m.direction, lastAt: m.sentAt.toISOString(), lastStatus: m.status,
        unreadCount: m.direction === "INBOUND" && m.status !== "READ" ? 1 : 0, totalCount: 1,
      });
    } else {
      ex.totalCount += 1;
      if (m.direction === "INBOUND" && m.status !== "READ") ex.unreadCount += 1;
      if (!ex.memberId && m.memberId) {
        ex.memberId = m.memberId;
        ex.memberName = m.member?.user.name ?? null;
        ex.memberEmail = m.member?.user.email ?? null;
        ex.memberAvatar = m.member?.user.avatar ?? null;
      }
    }
  }
  const conversations = Array.from(map.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );

  return (
    <InboxView
      conversations={conversations}
      members={members as any}
      configured={!!config?.isActive}
      displayNumber={config?.displayNumber ?? null}
    />
  );
}
