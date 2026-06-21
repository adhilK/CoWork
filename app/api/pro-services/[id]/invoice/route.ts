/**
 * POST /api/pro-services/[id]/invoice
 * Generate an invoice from the PRO service request fee and link it back.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { computeInvoiceTotals } from "@/lib/jurisdiction";
import { serviceTypeLabel } from "@/lib/pro-services/meta";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const request = await prisma.proServiceRequest.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { member: { include: { organization: { select: { jurisdiction: true } } } } },
  });
  if (!request) return apiError("PRO service request not found", 404);

  if (request.invoiceId) {
    return apiError("An invoice has already been generated for this request", 409);
  }
  if (!request.fee) {
    return apiError("No fee is set on this request. Add a fee before generating an invoice.", 400);
  }

  const subtotal = Number(request.fee);
  const totals = computeInvoiceTotals(subtotal, request.member.organization.jurisdiction);
  const year = new Date().getFullYear();

  const count = await prisma.invoice.count({ where: { organizationId: auth.organizationId } });
  const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const { invoice } = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        organizationId: auth.organizationId,
        memberId: request.memberId,
        invoiceNumber,
        amount: totals.totalAmount,
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        currency: request.currency,
        status: "PENDING",
        dueDate,
        notes: `PRO Service: ${serviceTypeLabel(request.serviceType)}`,
        lineItems: [
          {
            description: serviceTypeLabel(request.serviceType),
            quantity: 1,
            unitPrice: subtotal,
            total: subtotal,
          },
        ],
      },
    });
    await tx.proServiceRequest.update({
      where: { id: request.id },
      data: { invoiceId: inv.id },
    });
    return { invoice: inv };
  });

  return apiSuccess({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber }, 201);
}
