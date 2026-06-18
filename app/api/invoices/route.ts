import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { createInvoiceSchema } from "@/lib/validations";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams, formatCurrency } from "@/lib/utils";
import { computeInvoiceTotals } from "@/lib/jurisdiction";
import { stampInvoiceForZatca } from "@/lib/zatca";
import { enqueue, dispatchWhatsAppText } from "@/lib/jobs";
import { createPaymentLink } from "@/lib/payments";
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
  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: orgId },
    include: { organization: { select: { jurisdiction: true } } },
  });
  if (!member) return apiError("Member not found", 404);

  // Line-item totals are VAT-exclusive → add VAT on top per the org's jurisdiction.
  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const totals = computeInvoiceTotals(subtotal, member.organization.jurisdiction);
  const year = new Date().getFullYear();

  // Generate invoice number
  const count = await prisma.invoice.count({ where: { organizationId: orgId } });
  const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: orgId,
      memberId,
      invoiceNumber,
      amount: totals.totalAmount, // deprecated alias, kept == totalAmount
      subtotal: totals.subtotal,
      vatRate: totals.vatRate,
      vatAmount: totals.vatAmount,
      totalAmount: totals.totalAmount,
      currency: currency ?? "AED",
      status: "PENDING",
      dueDate,
      notes: notes ?? null,
      lineItems,
    },
    include: { member: { include: { user: true } } },
  });

  // ZATCA (KSA): stamp the Phase-1 QR, then queue the reporting submission.
  // No-op for UAE / ZATCA-disabled orgs.
  const zatca = await stampInvoiceForZatca(invoice.id);
  if (zatca) {
    await enqueue("zatca/invoice.submit", { organizationId: orgId, invoiceId: invoice.id });
  }

  // WhatsApp delivery with payment link — fire-and-forget, never blocks the response.
  void (async () => {
    try {
      const memberFull = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          whatsAppNumber: true,
          organization: { select: { paymentProvider: true, name: true } },
        },
      });
      if (!memberFull?.whatsAppNumber) return;

      const invoiceUser = invoice.member.user;
      const currency = invoice.currency;
      const total = Number(invoice.totalAmount);

      let paymentUrl: string | null = null;
      try {
        const link = await createPaymentLink({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: total,
          currency,
          organizationId: orgId,
          memberId,
          customerEmail: invoiceUser.email,
          customerName: invoiceUser.name,
          paymentProvider: memberFull.organization.paymentProvider,
        });
        paymentUrl = link.checkoutUrl;
      } catch {
        // Payment link failure must not prevent the invoice notification.
      }

      const dueStr = invoice.dueDate.toLocaleDateString("en-GB");
      const payLine = paymentUrl ? `\n\nPay now: ${paymentUrl}` : "";
      await dispatchWhatsAppText({
        organizationId: orgId,
        to: memberFull.whatsAppNumber,
        memberId,
        messageType: "INVOICE_ISSUED",
        relatedEntityType: "invoice",
        relatedEntityId: invoice.id,
        body: `Hi ${invoiceUser.name ?? "there"}, your invoice ${invoice.invoiceNumber} for ${formatCurrency(total, currency)} is ready. Due ${dueStr}.${payLine}`,
      });
    } catch (err) {
      console.error("[invoices] WhatsApp notification failed:", err);
    }
  })();

  return apiSuccess(zatca ? { ...invoice, ...zatca } : invoice, 201);
}
