import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { enqueue } from "@/lib/jobs";
import { runBroadcast } from "@/lib/jobs/broadcast";
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

  // Prefer the queue: hand the fan-out to Inngest so a large send never blocks
  // the request. Falls back to running inline when Inngest isn't configured.
  const queued = await enqueue("whatsapp/broadcast.send", {
    organizationId: orgId,
    broadcastId: broadcast.id,
  });
  if (queued) {
    // Status stays SENDING; the job updates counts + completion.
    return apiSuccess(broadcast, 202);
  }

  const result = await runBroadcast(orgId, broadcast.id);
  const updated = await prisma.whatsAppBroadcast.findUnique({ where: { id: broadcast.id } });
  return apiSuccess(updated ?? { ...broadcast, ...result }, 201);
}
