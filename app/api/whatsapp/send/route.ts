import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { renderTemplateBody } from "@/lib/whatsapp";
import { dispatchWhatsAppText, dispatchWhatsAppTemplate } from "@/lib/jobs";
import { z } from "zod";

const sendSchema = z.object({
  to: z.string().min(6).max(20),
  memberId: z.string().cuid().optional().nullable(),
  // Freeform text send
  body: z.string().min(1).max(4096).optional(),
  // Template send
  templateName: z.string().optional(),
  params: z.array(z.string()).optional(),
  messageType: z
    .enum([
      "BOOKING_CONFIRMATION", "BOOKING_REMINDER", "INVOICE_ISSUED", "INVOICE_PAID",
      "VISITOR_ARRIVAL", "DOCUMENT_EXPIRY", "BUSINESS_SETUP_UPDATE", "PRO_SERVICE_UPDATE",
      "MAIL_RECEIVED", "RENEWAL_REMINDER", "ANNOUNCEMENT", "SUPPORT_MESSAGE", "CUSTOM",
    ])
    .optional(),
}).refine((d) => d.body || d.templateName, {
  message: "Either body or templateName is required",
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  // Validate member belongs to org if provided
  if (d.memberId) {
    const member = await prisma.member.findFirst({
      where: { id: d.memberId, organizationId: orgId, deletedAt: null },
    });
    if (!member) return apiError("Member not found", 404);
  }

  // Template send
  if (d.templateName) {
    const template = await prisma.whatsAppTemplate.findFirst({
      where: { organizationId: orgId, name: d.templateName, deletedAt: null },
    });
    if (!template) return apiError("Template not found", 404);

    const params = d.params ?? [];
    const renderedBody = renderTemplateBody(template.body, params);
    await dispatchWhatsAppTemplate({
      organizationId: orgId,
      to: d.to,
      memberId: d.memberId ?? null,
      templateName: template.name,
      language: template.language,
      params,
      renderedBody,
      messageType: d.messageType ?? "CUSTOM",
    });
    return apiSuccess({ dispatched: true }, 201);
  }

  // Freeform text send
  await dispatchWhatsAppText({
    organizationId: orgId,
    to: d.to,
    memberId: d.memberId ?? null,
    body: d.body!,
    messageType: d.messageType ?? "SUPPORT_MESSAGE",
  });
  return apiSuccess({ dispatched: true }, 201);
}
