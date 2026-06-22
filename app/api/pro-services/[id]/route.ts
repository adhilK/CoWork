import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireProServices } from "@/lib/pro-services/access";
import { dispatchWhatsAppText } from "@/lib/jobs";
import { proStageLabel, serviceTypeLabel } from "@/lib/pro-services/meta";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireProServices();
  if (!auth) return apiError("Forbidden", 403);

  const r = await prisma.proServiceRequest.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: {
      activities: { orderBy: { createdAt: "desc" } },
      member: { include: { user: { select: { name: true, email: true } } } },
    },
  });
  if (!r) return apiError("Request not found", 404);

  return apiSuccess({ ...r, fee: r.fee == null ? null : Number(r.fee) });
}

const stepSchema = z.object({
  step: z.string().min(1).max(200),
  status: z.enum(["pending", "in_progress", "done"]).default("pending"),
  completedAt: z.string().optional().nullable(),
});

const updateSchema = z.object({
  stage: z.enum([
    "SUBMITTED", "DOCUMENTS_PENDING", "DOCUMENTS_RECEIVED", "IN_PROGRESS", "AT_TYPING_CENTRE",
    "AT_GOVERNMENT", "AWAITING_COLLECTION", "COMPLETED", "ON_HOLD", "CANCELLED",
  ]).optional(),
  cancelReason: z.string().max(500).optional().nullable(),
  urgency: z.enum(["STANDARD", "EXPRESS", "URGENT"]).optional(),
  governingBody: z.string().max(80).optional().nullable(),
  referenceNumber: z.string().max(120).optional().nullable(),
  fee: z.number().min(0).optional().nullable(),
  slaDays: z.number().int().min(0).max(180).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  serviceDescription: z.string().max(1000).optional().nullable(),
  clientNotes: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(),
  steps: z.array(stepSchema).optional(),
  // Notify the client on this stage change (default true).
  notifyClient: z.boolean().default(true),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireProServices();
  if (!auth) return apiError("Forbidden", 403);

  const request = await prisma.proServiceRequest.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { member: { select: { whatsAppNumber: true, user: { select: { name: true } } } } },
  });
  if (!request) return apiError("Request not found", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const data: any = {};
  if (d.urgency !== undefined) data.urgency = d.urgency;
  if (d.governingBody !== undefined) data.governingBody = d.governingBody;
  if (d.referenceNumber !== undefined) data.referenceNumber = d.referenceNumber;
  if (d.fee !== undefined) data.fee = d.fee;
  if (d.slaDays !== undefined) data.slaDays = d.slaDays;
  if (d.dueDate !== undefined) data.dueDate = d.dueDate;
  if (d.assignedTo !== undefined) data.assignedTo = d.assignedTo || null;
  if (d.serviceDescription !== undefined) data.serviceDescription = d.serviceDescription;
  if (d.clientNotes !== undefined) data.clientNotes = d.clientNotes;
  if (d.internalNotes !== undefined) data.internalNotes = d.internalNotes;
  if (d.steps !== undefined) data.steps = d.steps;

  let stageChanged = false;
  if (d.stage && d.stage !== request.stage) {
    stageChanged = true;
    data.stage = d.stage;
    if (d.stage === "COMPLETED") data.completedAt = new Date();
    if (d.stage === "CANCELLED") { data.cancelledAt = new Date(); data.cancelReason = d.cancelReason ?? request.cancelReason; }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.proServiceRequest.update({ where: { id: request.id }, data });
    if (stageChanged) {
      await tx.proServiceActivity.create({
        data: { requestId: request.id, userId: auth.userId, stage: d.stage as any, note: `Status updated to ${proStageLabel(d.stage!)}`, isClientVisible: true },
      });
    }
    return u;
  });

  // Notify the client on stage change (queued WhatsApp).
  if (stageChanged && d.notifyClient && request.member.whatsAppNumber) {
    await dispatchWhatsAppText({
      organizationId: auth.organizationId,
      to: request.member.whatsAppNumber,
      messageType: "PRO_SERVICE_UPDATE",
      relatedEntityType: "pro_service",
      relatedEntityId: request.id,
      body: `Hi ${request.member.user.name ?? "there"}, an update on your ${serviceTypeLabel(request.serviceType)}: status is now "${proStageLabel(d.stage!)}".`,
    });
  }

  return apiSuccess({ ...updated, fee: updated.fee == null ? null : Number(updated.fee) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireProServices();
  if (!auth) return apiError("Forbidden", 403);

  const request = await prisma.proServiceRequest.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!request) return apiError("Request not found", 404);

  await prisma.proServiceRequest.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return apiSuccess({ success: true });
}
