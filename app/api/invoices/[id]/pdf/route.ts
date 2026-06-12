// renderToBuffer requires Node.js runtime (not edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";
import { zatcaQrToDataUrl } from "@/lib/zatca";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Resolve whether this user is an admin/owner of an org, or a member
  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: { organizationId: true, role: true },
  });

  const memberRecord = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, organizationId: true },
  });

  // Build the invoice query filter:
  // - Admins/Owners: invoice must belong to their org
  // - Members: invoice must belong to them specifically
  const isAdmin = userOrg && userOrg.role !== "MEMBER";

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      ...(isAdmin
        ? { organizationId: userOrg!.organizationId }
        : memberRecord
          ? { memberId: memberRecord.id, organizationId: memberRecord.organizationId }
          : { id: "" }), // deny if neither admin nor member
    },
    include: {
      organization: {
        select: {
          name: true,
          address: true,
          email: true,
          phone: true,
          taxRegistrationNumber: true,
          jurisdiction: true,
          currency: true,
        },
      },
      member: {
        include: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!invoice) return new Response("Not found", { status: 404 });

  // ZATCA Phase-1 QR → scannable PNG (KSA invoices that have been stamped).
  const zatcaQrDataUrl = invoice.zatcaQrCode ? await zatcaQrToDataUrl(invoice.zatcaQrCode) : null;

  const lineItems = Array.isArray(invoice.lineItems)
    ? (invoice.lineItems as { description: string; quantity: number; unitPrice: number; total: number }[])
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(InvoicePdf, {
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.createdAt,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      status: invoice.status,
      lineItems,
      subtotal: Number(invoice.subtotal),
      vatRate: Number(invoice.vatRate),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.totalAmount),
      currency: invoice.currency,
      notes: invoice.notes,
      zatcaQrDataUrl,
      zatcaUuid: invoice.zatcaUuid,
      zatcaStatus: invoice.zatcaStatus,
    },
    org: invoice.organization,
    member: {
      name: invoice.member.user.name,
      email: invoice.member.user.email,
      company: invoice.member.company,
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as any;

  const pdfBuffer = await renderToBuffer(element);

  const filename = `${invoice.invoiceNumber ?? `INV-${invoice.id.slice(-8).toUpperCase()}`}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
