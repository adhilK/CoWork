import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireProServices } from "@/lib/pro-services/access";
import { dispatchWhatsAppText } from "@/lib/jobs";
import { z } from "zod";

const schema = z.object({
  note: z.string().min(1).max(2000),
  isClientVisible: z.boolean().default(true),
  // When true (and the member has WhatsApp), also send the note to the client.
  sendWhatsApp: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireProServices();
  if (!auth) return apiError("Forbidden", 403);

  const request = await prisma.proServiceRequest.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { member: { select: { whatsAppNumber: true } } },
  });
  if (!request) return apiError("Request not found", 404);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const { note, isClientVisible, sendWhatsApp } = parsed.data;

  const activity = await prisma.proServiceActivity.create({
    data: { requestId: request.id, userId: auth.userId, note, isClientVisible },
  });

  if (sendWhatsApp && request.member.whatsAppNumber) {
    await dispatchWhatsAppText({
      organizationId: auth.organizationId,
      to: request.member.whatsAppNumber,
      messageType: "PRO_SERVICE_UPDATE",
      relatedEntityType: "pro_service",
      relatedEntityId: request.id,
      body: note,
    });
  }

  return apiSuccess(activity, 201);
}
