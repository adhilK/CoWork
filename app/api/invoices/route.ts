import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { createInvoiceSchema } from "@/lib/validations";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status");
  const memberId = sp.get("memberId");
  const { page, limit, skip } = getPaginationParams(sp);

  const where = {
    organizationId: orgId,
    deletedAt: null,
    ...(status && status !== "all" && { status: status as any }),
    ...(memberId && { memberId }),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { member: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      skip, take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return apiSuccess({ data: invoices, meta: buildPaginationMeta(total, page, limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const body = await req.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { memberId, lineItems, dueDate, notes, currency, sendImmediately } = parsed.data;

  // Verify member belongs to org
  const member = await prisma.member.findFirst({ where: { id: memberId, organizationId: orgId } });
  if (!member) return apiError("Member not found", 404);

  const total = lineItems.reduce((s, li) => s + li.total, 0);
  const year = new Date().getFullYear();

  // Generate invoice number
  const count = await prisma.invoice.count({ where: { organizationId: orgId } });
  const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: orgId,
      memberId,
      invoiceNumber,
      amount: total,
      currency: currency ?? "GBP",
      status: "PENDING",
      dueDate,
      notes: notes ?? null,
      lineItems,
    },
    include: { member: { include: { user: true } } },
  });

  return apiSuccess(invoice, 201);
}
