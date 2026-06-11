import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

/**
 * Conversation list — derived by grouping WhatsAppMessage rows per phone number.
 * Returns the most recent message and unread (inbound, not-yet-read) count for
 * each distinct phone, newest first.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  // Pull recent messages (cap for performance), then fold into conversations.
  const messages = await prisma.whatsAppMessage.findMany({
    where: { organizationId: orgId },
    orderBy: { sentAt: "desc" },
    take: 1000,
    include: {
      member: { include: { user: { select: { name: true, email: true, avatar: true } } } },
    },
  });

  type Convo = {
    phone: string;
    memberId: string | null;
    memberName: string | null;
    memberEmail: string | null;
    memberAvatar: string | null;
    lastMessage: string;
    lastDirection: string;
    lastAt: Date;
    lastStatus: string;
    unreadCount: number;
    totalCount: number;
  };

  const map = new Map<string, Convo>();

  for (const m of messages) {
    const existing = map.get(m.phone);
    if (!existing) {
      map.set(m.phone, {
        phone: m.phone,
        memberId: m.memberId,
        memberName: m.member?.user.name ?? null,
        memberEmail: m.member?.user.email ?? null,
        memberAvatar: m.member?.user.avatar ?? null,
        lastMessage: m.content,
        lastDirection: m.direction,
        lastAt: m.sentAt,
        lastStatus: m.status,
        unreadCount: m.direction === "INBOUND" && m.status !== "READ" ? 1 : 0,
        totalCount: 1,
      });
    } else {
      existing.totalCount += 1;
      if (m.direction === "INBOUND" && m.status !== "READ") existing.unreadCount += 1;
      // Fill member info if a later (older) message had it and the latest didn't
      if (!existing.memberId && m.memberId) {
        existing.memberId = m.memberId;
        existing.memberName = m.member?.user.name ?? null;
        existing.memberEmail = m.member?.user.email ?? null;
        existing.memberAvatar = m.member?.user.avatar ?? null;
      }
    }
  }

  const conversations = Array.from(map.values()).sort(
    (a, b) => b.lastAt.getTime() - a.lastAt.getTime()
  );

  return apiSuccess({ data: conversations });
}
