import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { computeInvoiceTotals } from "@/lib/jurisdiction";
import { sendInvoiceEmail } from "@/lib/email";
import { z } from "zod";
import { format } from "date-fns";

// Admin-only endpoint: generating invoices is an operator action.
async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true, role: true } });
  if (!uo || uo.role === "MEMBER") return null;
  return uo.organizationId;
}

const schema = z.object({
  bookingIds: z.array(z.string()).min(1, "Select at least one booking"),
  memberId: z.string().min(1),
  dueDate: z.string(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { bookingIds, memberId, dueDate, notes } = parsed.data;

  // Verify member belongs to org
  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: orgId },
    include: { organization: { select: { name: true, currency: true, jurisdiction: true } } },
  });
  if (!member) return apiError("Member not found", 404);

  // Fetch and validate all bookings
  const bookings = await prisma.booking.findMany({
    where: {
      id: { in: bookingIds },
      organizationId: orgId,
      invoiceId: null,
      amountCharged: { gt: 0 },
      deletedAt: null,
    },
    include: { resource: { select: { name: true } } },
  });

  if (bookings.length !== bookingIds.length) {
    return apiError("Some bookings are invalid, already invoiced, or have no charge", 400);
  }

  // Build line items from bookings
  const lineItems = bookings.map((b) => {
    const durationHours = (b.endTime.getTime() - b.startTime.getTime()) / 3600000;
    const dateLabel = format(b.startTime, "d MMM yyyy, HH:mm");
    return {
      description: `${b.resource.name}${b.title ? ` — ${b.title}` : ""} (${dateLabel}, ${durationHours.toFixed(1)}h)`,
      quantity: 1,
      unitPrice: Number(b.amountCharged),
      total: Number(b.amountCharged),
      bookingId: b.id,
    };
  });

  // Booking charges are VAT-exclusive → add VAT on top per the org's jurisdiction.
  const subtotal = lineItems.reduce((s, li) => s + li.total, 0);
  const totals = computeInvoiceTotals(subtotal, member.organization.jurisdiction);

  // Generate invoice number
  const count = await prisma.invoice.count({ where: { organizationId: orgId } });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  // Create invoice + mark bookings as invoiced in a transaction
  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        organizationId: orgId,
        memberId,
        invoiceNumber,
        amount: totals.totalAmount, // deprecated alias, kept == totalAmount
        subtotal: totals.subtotal,
        vatRate: totals.vatRate,
        vatAmount: totals.vatAmount,
        totalAmount: totals.totalAmount,
        currency: member.organization.currency ?? "AED",
        status: "PENDING",
        dueDate: new Date(dueDate),
        notes: notes ?? null,
        lineItems,
      },
      include: { member: { include: { user: true } } },
    });

    // Link each booking to this invoice
    await tx.booking.updateMany({
      where: { id: { in: bookingIds } },
      data: { invoiceId: inv.id },
    });

    return inv;
  });

  // Invoice email (fire-and-forget)
  if (invoice.member?.user?.email) {
    void sendInvoiceEmail({
      to: invoice.member.user.email,
      memberName: invoice.member.user.name,
      orgName: member.organization.name,
      invoiceNumber,
      amount: totals.totalAmount,
      currency: invoice.currency,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      vatRate: totals.vatRate,
      dueDate: invoice.dueDate,
      lineItems: lineItems.map((li) => ({ description: li.description, total: li.total })),
    });
  }

  return apiSuccess(invoice, 201);
}
