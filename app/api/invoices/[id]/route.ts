import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

// Admin-only endpoint: members view their invoices via the portal, not here.
async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true, role: true } });
  if (!uo || uo.role === "MEMBER") return null;
  return uo.organizationId;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, organizationId: orgId ?? "", deletedAt: null },
    include: { member: { include: { user: true } } },
  });
  if (!invoice) return apiError("Not found", 404);
  return apiSuccess(invoice);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);

  const invoice = await prisma.invoice.findFirst({ where: { id: params.id, organizationId: orgId ?? "" } });
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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);

  const invoice = await prisma.invoice.findFirst({ where: { id: params.id, organizationId: orgId ?? "" } });
  if (!invoice) return apiError("Not found", 404);

  await prisma.invoice.update({ where: { id: params.id }, data: { deletedAt: new Date(), status: "CANCELLED" } });
  return apiSuccess({ success: true });
}
