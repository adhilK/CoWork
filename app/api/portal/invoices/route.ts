import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, getPaginationParams, buildPaginationMeta } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, organizationId: true },
  });
  if (!member) return apiError("Member not found", 404);

  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);

  const where = {
    memberId: member.id,
    organizationId: member.organizationId,
    deletedAt: null as null,
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  // Serialize Decimal fields
  const data = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    amount: Number(inv.amount),
    currency: inv.currency,
    status: inv.status,
    dueDate: inv.dueDate,
    paidAt: inv.paidAt,
    periodStart: inv.periodStart,
    periodEnd: inv.periodEnd,
    notes: inv.notes,
    lineItems: inv.lineItems,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  }));

  return apiSuccess({ data, meta: buildPaginationMeta(total, page, limit) });
}
