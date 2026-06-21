/**
 * POST /api/proposals/[publicToken]/accept
 * Public endpoint (no auth) — token is the proof of identity.
 * Marks the proposal as ACCEPTED and advances the lead stage.
 */

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { publicToken: string } }) {
  const proposal = await prisma.businessSetupProposal.findUnique({
    where: { publicToken: params.publicToken },
    include: { lead: { select: { id: true, organizationId: true, stage: true } } },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.publicTokenExpiresAt && proposal.publicTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "This proposal link has expired" }, { status: 410 });
  }
  if (proposal.status !== "SENT") {
    return NextResponse.json({ error: "Proposal is no longer accepting responses", status: proposal.status });
  }

  await prisma.$transaction(async (tx) => {
    await tx.businessSetupProposal.update({
      where: { id: proposal.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    // Advance the lead to APPROVED if still at an earlier stage.
    const advanceable = ["NEW_ENQUIRY", "QUALIFIED", "PROPOSAL_SENT", "DOCUMENTS_COLLECTION"];
    if (advanceable.includes(proposal.lead.stage)) {
      await tx.businessSetupLead.update({
        where: { id: proposal.lead.id },
        data: { stage: "AWAITING_APPROVAL" },
      });
    }
    await tx.leadActivity.create({
      data: {
        leadId: proposal.lead.id,
        userId: proposal.lead.organizationId, // system actor — org id as placeholder
        activityType: "NOTE",
        note: "Client accepted proposal via portal link",
      },
    });
  });

  return NextResponse.json({ ok: true });
}
