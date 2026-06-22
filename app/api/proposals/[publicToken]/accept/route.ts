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

  const FORWARD_STAGES = ["NEW_ENQUIRY","QUALIFIED","PROPOSAL_SENT","DOCUMENTS_COLLECTION","SUBMITTED_TO_AUTHORITY","AWAITING_APPROVAL","APPROVED","COMPLETED"];
  const stageIdx = (s: string) => FORWARD_STAGES.indexOf(s);
  const shouldAdvance = proposal.lead.stage !== "LOST" && stageIdx(proposal.lead.stage) < stageIdx("DOCUMENTS_COLLECTION");

  await prisma.$transaction(async (tx) => {
    await tx.businessSetupProposal.update({
      where: { id: proposal.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    if (shouldAdvance) {
      await tx.businessSetupLead.update({
        where: { id: proposal.lead.id },
        data: { stage: "DOCUMENTS_COLLECTION" },
      });
      await tx.leadActivity.create({
        data: {
          leadId: proposal.lead.id,
          userId: proposal.lead.organizationId,
          activityType: "STAGE_CHANGE",
          note: "Stage → Documents Collection",
        },
      });
    }
    await tx.leadActivity.create({
      data: {
        leadId: proposal.lead.id,
        userId: proposal.lead.organizationId,
        activityType: "NOTE",
        note: "Client accepted proposal via portal link",
      },
    });
  });

  return NextResponse.json({ ok: true });
}
