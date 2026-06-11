import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { resolveDocumentAccess } from "@/lib/documents";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["PENDING", "FULFILLED", "OVERDUE", "CANCELLED"]).optional(),
  message: z.string().max(1000).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);
  if (!access.isAdmin) return apiError("Only staff can update requests", 403);

  const request = await prisma.documentRequest.findFirst({
    where: { id: params.id, organizationId: access.organizationId, deletedAt: null },
  });
  if (!request) return apiError("Request not found", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const data: any = {};
  if (d.message !== undefined) data.message = d.message;
  if (d.dueDate !== undefined) data.dueDate = d.dueDate ? new Date(d.dueDate) : null;
  if (d.status !== undefined) {
    data.status = d.status;
    if (d.status === "FULFILLED") data.fulfilledAt = new Date();
  }

  const updated = await prisma.documentRequest.update({
    where: { id: params.id },
    data,
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });

  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);
  if (!access.isAdmin) return apiError("Only staff can delete requests", 403);

  const request = await prisma.documentRequest.findFirst({
    where: { id: params.id, organizationId: access.organizationId, deletedAt: null },
  });
  if (!request) return apiError("Request not found", 404);

  await prisma.documentRequest.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: "CANCELLED" },
  });

  return apiSuccess({ success: true });
}
