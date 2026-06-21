import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { member: { include: { user: true } } },
  });
  if (!invoice) return apiError("Not found", 404);
  return apiSuccess(invoice);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!invoice) return apiError("Not found", 404);

  const body = await req.json();
  const updated = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.paidAt && { paidAt: new Date(body.paidAt) }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: { member: { include: { user: true } } },
  });
  return apiSuccess(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!invoice) return apiError("Not found", 404);

  await prisma.invoice.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), status: "CANCELLED" },
  });
  return apiSuccess({ success: true });
}
