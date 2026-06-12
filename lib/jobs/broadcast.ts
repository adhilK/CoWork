/**
 * WhatsApp broadcast fan-out — shared by the Inngest job and the inline
 * fallback in the broadcasts API route. Loads a SENDING broadcast, resolves its
 * audience, sends each message, and records the final counts.
 */

import { prisma } from "@/lib/prisma";
import { sendWhatsAppText, sendWhatsAppTemplate, renderTemplateBody } from "@/lib/whatsapp";

export type BroadcastResult = { sent: number; failed: number; recipients: number };

export async function runBroadcast(organizationId: string, broadcastId: string): Promise<BroadcastResult> {
  const broadcast = await prisma.whatsAppBroadcast.findFirst({
    where: { id: broadcastId, organizationId, deletedAt: null },
  });
  if (!broadcast) return { sent: 0, failed: 0, recipients: 0 };

  // Mark as sending (in case it was queued from DRAFT).
  await prisma.whatsAppBroadcast.update({
    where: { id: broadcast.id },
    data: { status: "SENDING", startedAt: broadcast.startedAt ?? new Date() },
  });

  const filter = (broadcast.audienceFilter as any) ?? {};
  const where: any = {
    organizationId,
    deletedAt: null,
    whatsAppNumber: { not: null },
    status: filter.status ?? "ACTIVE",
  };
  if (filter.membershipPlanId) where.membershipPlanId = filter.membershipPlanId;

  const recipients = await prisma.member.findMany({
    where,
    select: { id: true, whatsAppNumber: true },
  });

  let template = null as Awaited<ReturnType<typeof prisma.whatsAppTemplate.findFirst>>;
  if (broadcast.templateName) {
    template = await prisma.whatsAppTemplate.findFirst({
      where: { organizationId, name: broadcast.templateName, deletedAt: null },
    });
  }

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    if (!r.whatsAppNumber) { failed++; continue; }
    const res = template
      ? await sendWhatsAppTemplate({
          organizationId, to: r.whatsAppNumber, memberId: r.id,
          templateName: template.name, language: template.language, params: [],
          renderedBody: renderTemplateBody(template.body, []),
          messageType: "ANNOUNCEMENT", broadcastId: broadcast.id,
        })
      : await sendWhatsAppText({
          organizationId, to: r.whatsAppNumber, memberId: r.id,
          body: broadcast.content, messageType: "ANNOUNCEMENT", broadcastId: broadcast.id,
        });
    if (res.ok) sent++; else failed++;
  }

  await prisma.whatsAppBroadcast.update({
    where: { id: broadcast.id },
    data: {
      status: failed === recipients.length && recipients.length > 0 ? "FAILED" : "SENT",
      sentCount: sent, failedCount: failed, recipientCount: recipients.length,
      completedAt: new Date(),
    },
  });

  return { sent, failed, recipients: recipients.length };
}
