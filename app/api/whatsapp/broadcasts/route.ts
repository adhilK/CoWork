import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { sendWhatsAppText, sendWhatsAppTemplate, renderTemplateBody } from "@/lib/whatsapp";
import { z } from "zod";

const createBroadcastSchema = z.object({
  name: z.string().min(1).max(200),
  // Either a template or freeform content
  templateName: z.string().optional().nullable(),
  content: z.string().min(1).max(4096),
  audienceFilter: z
    .object({
      status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
      membershipPlanId: z.string().optional(),
    })
    .optional(),
  // If true, send immediately; otherwise save as DRAFT.
  sendNow: z.boolean().default(false),
});

export async function GET(_req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const broadcasts = await prisma.whatsAppBroadcast.findMany({
    where: { organizationId: auth.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess({ data: broadcasts });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const body = await req.json();
  const parsed = createBroadcastSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  // Resolve audience: active members with a WhatsApp number, filtered.
  const where: any = {
    organizationId: orgId,
    deletedAt: null,
    whatsAppNumber: { not: null },
  };
  if (d.audienceFilter?.status) where.status = d.audienceFilter.status;
  else where.status = "ACTIVE";
  if (d.audienceFilter?.membershipPlanId) where.membershipPlanId = d.audienceFilter.membershipPlanId;

  const recipients = await prisma.member.findMany({
    where,
    select: { id: true, whatsAppNumber: true },
  });

  // If using a template, validate it exists
  let template = null;
  if (d.templateName) {
    template = await prisma.whatsAppTemplate.findFirst({
      where: { organizationId: orgId, name: d.templateName, deletedAt: null },
    });
    if (!template) return apiError("Template not found", 404);
  }

  const broadcast = await prisma.whatsAppBroadcast.create({
    data: {
      organizationId: orgId,
      name: d.name,
      templateName: d.templateName ?? null,
      content: d.content,
      audienceFilter: d.audienceFilter ?? undefined,
      recipientCount: recipients.length,
      status: d.sendNow ? "SENDING" : "DRAFT",
      startedAt: d.sendNow ? new Date() : null,
    },
  });

  if (!d.sendNow) {
    return apiSuccess(broadcast, 201);
  }

  // Fan out. Sends are throttled lightly to avoid Meta rate limits. For large
  // audiences this should move to an Inngest job; inline is acceptable at the
  // current scale (1–5 locations, ≤300 members).
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    if (!r.whatsAppNumber) { failed += 1; continue; }
    const result = template
      ? await sendWhatsAppTemplate({
          organizationId: orgId,
          to: r.whatsAppNumber,
          memberId: r.id,
          templateName: template.name,
          language: template.language,
          params: [],
          renderedBody: renderTemplateBody(template.body, []),
          messageType: "ANNOUNCEMENT",
          broadcastId: broadcast.id,
        })
      : await sendWhatsAppText({
          organizationId: orgId,
          to: r.whatsAppNumber,
          memberId: r.id,
          body: d.content,
          messageType: "ANNOUNCEMENT",
          broadcastId: broadcast.id,
        });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  const updated = await prisma.whatsAppBroadcast.update({
    where: { id: broadcast.id },
    data: {
      status: failed === recipients.length && recipients.length > 0 ? "FAILED" : "SENT",
      sentCount: sent,
      failedCount: failed,
      completedAt: new Date(),
    },
  });

  return apiSuccess(updated, 201);
}
