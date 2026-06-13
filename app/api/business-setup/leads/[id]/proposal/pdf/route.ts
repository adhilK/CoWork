export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { prisma } from "@/lib/prisma";
import { requireBusinessSetup } from "@/lib/business-setup/access";
import { ProposalPdf } from "@/lib/pdf/proposal-pdf";
import { licenseTypeLabel } from "@/lib/license-catalog/uae";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireBusinessSetup();
  if (!auth) return new Response("Forbidden", { status: 403 });

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { proposal: true, organization: { select: { name: true, email: true, phone: true } } },
  });
  if (!lead || !lead.proposal) return new Response("Proposal not found", { status: 404 });

  const lineItems = Array.isArray(lead.proposal.lineItems)
    ? (lead.proposal.lineItems as { service: string; description?: string | null; fee: number }[])
    : [];

  const proposalNumber = `PROP-${lead.id.slice(-8).toUpperCase()}`;

  const element = React.createElement(ProposalPdf, {
    p: {
      proposalNumber,
      orgName: lead.organization.name,
      orgEmail: lead.organization.email,
      orgPhone: lead.organization.phone,
      clientName: lead.clientName,
      companyName: lead.companyName,
      clientEmail: lead.clientEmail,
      jurisdiction: lead.jurisdiction,
      licenseLabel: licenseTypeLabel(lead.licenseType),
      authority: lead.freezoneName ?? lead.sezName,
      lineItems,
      totalFee: Number(lead.proposal.totalFee),
      currency: lead.proposal.currency,
      validUntil: lead.proposal.validUntil,
      notes: lead.proposal.notes,
      createdAt: lead.proposal.createdAt,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any) as any;

  const pdf = await renderToBuffer(element);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${proposalNumber}.pdf"`,
      "Content-Length": String(pdf.length),
    },
  });
}
