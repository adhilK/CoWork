import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

const updateMailSchema = z.object({
  senderName: z.string().max(200).optional().nullable(),
  senderAddress: z.string().max(500).optional().nullable(),
  mailType: z.enum(["LETTER", "PACKAGE", "LEGAL_DOCUMENT", "GOVERNMENT_CORRESPONDENCE", "COURIER", "OTHER"]).optional(),
  description: z.string().max(1000).optional().nullable(),
  trackingNumber: z.string().max(100).optional().nullable(),
  subscriptionId: z.string().cuid().optional().nullable(),
  forwardedAt: z.coerce.date().optional().nullable(),
  forwardedTo: z.string().max(300).optional().nullable(),
  collectedAt: z.coerce.date().optional().nullable(),
  notifiedAt: z.coerce.date().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const mailItem = await prisma.mailItem.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!mailItem) return apiError("Mail item not found", 404);

  const body = await req.json();
  const parsed = updateMailSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const updated = await prisma.mailItem.update({
    where: { id: params.id },
    data: parsed.data,
    include: {
      address: { select: { id: true, addressLine: true } },
      subscription: {
        select: {
          id: true,
          companyName: true,
          member: { include: { user: { select: { name: true, email: true } } } },
        },
      },
    },
  });

  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const mailItem = await prisma.mailItem.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!mailItem) return apiError("Mail item not found", 404);

  await prisma.mailItem.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });

  return apiSuccess({ success: true });
}
