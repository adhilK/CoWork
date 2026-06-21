// renderToBuffer requires Node.js runtime (not edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { InvoicePdf, registerInvoiceFonts } from "@/lib/pdf/invoice-pdf";
import { zatcaQrToDataUrl } from "@/lib/zatca";
import { getBaseUrl } from "@/lib/utils";

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

  // Build OR conditions: match if user is an admin of the invoice's org
  // OR if the invoice belongs to this member directly. Using OR means a user
  // who is both admin and member (common when testing) always finds the invoice.
  const accessConditions: object[] = [];
  if (userOrg) accessConditions.push({ organizationId: userOrg.organizationId });
  if (memberRecord) accessConditions.push({ memberId: memberRecord.id });
  if (accessConditions.length === 0) return new Response("Unauthorized", { status: 401 });

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      OR: accessConditions,
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
          jurisdictionConfig: { select: { arabicInvoices: true } },
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

  // Bilingual KSA tax invoice: Arabic is mandatory when the org operates in KSA
  // and has enabled Arabic invoices. Register the Arabic font only then.
  const arabic =
    invoice.organization.jurisdiction === "KSA" &&
    !!invoice.organization.jurisdictionConfig?.arabicInvoices;
  if (arabic) registerInvoiceFonts(getBaseUrl());

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
    arabic,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as any;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(element);
  } catch (err) {
    console.error("[invoice/pdf] renderToBuffer failed:", err);
    return new Response("PDF generation failed. Please try again.", { status: 500 });
  }

  const filename = `${invoice.invoiceNumber ?? `INV-${invoice.id.slice(-8).toUpperCase()}`}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
