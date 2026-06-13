import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireBusinessSetup } from "@/lib/business-setup/access";
import { dispatchWhatsAppText } from "@/lib/jobs";
import { z } from "zod";

const schema = z.object({
  activityType: z.enum([
    "NOTE", "CALL", "WHATSAPP", "EMAIL", "MEETING", "DOCUMENT_RECEIVED", "PAYMENT_RECEIVED",
  ]),
  note: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!lead) return apiError("Lead not found", 404);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const { activityType, note } = parsed.data;

  const activity = await prisma.leadActivity.create({
    data: { leadId: lead.id, userId: auth.userId, activityType, note },
  });

  // A WhatsApp activity actually sends the message to the lead (queued).
  if (activityType === "WHATSAPP" && lead.clientWhatsapp) {
    await dispatchWhatsAppText({
      organizationId: auth.organizationId,
      to: lead.clientWhatsapp,
      messageType: "CUSTOM",
      relatedEntityType: "business_setup_lead",
      relatedEntityId: lead.id,
      body: note,
    });
  }

  return apiSuccess(activity, 201);
}
