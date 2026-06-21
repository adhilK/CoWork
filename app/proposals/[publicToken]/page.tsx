import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProposalPublicView } from "@/components/proposals/proposal-public-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { publicToken: string } }): Promise<Metadata> {
  const proposal = await prisma.businessSetupProposal.findUnique({
    where: { publicToken: params.publicToken },
    include: { lead: { include: { organization: { select: { name: true } } } } },
  });
  if (!proposal) return { title: "Proposal not found" };
  return { title: `Business Setup Proposal — ${proposal.lead.organization.name}` };
}

export default async function PublicProposalPage({ params }: { params: { publicToken: string } }) {
  const proposal = await prisma.businessSetupProposal.findUnique({
    where: { publicToken: params.publicToken },
    include: {
      lead: {
        include: { organization: { select: { name: true } } },
      },
    },
  });

  if (!proposal) notFound();

  // Treat as expired if the token's expiry is in the past.
  const isExpired = proposal.publicTokenExpiresAt != null && proposal.publicTokenExpiresAt < new Date();
  const effectiveStatus = isExpired && proposal.status === "SENT" ? "EXPIRED" : proposal.status;

  const lineItems = (proposal.lineItems as { service: string; description?: string | null; fee: number }[]) ?? [];

  return (
    <ProposalPublicView
      publicToken={params.publicToken}
      orgName={proposal.lead.organization.name}
      clientName={proposal.lead.clientName}
      lineItems={lineItems}
      subtotal={Number(proposal.subtotal)}
      totalFee={Number(proposal.totalFee)}
      currency={proposal.currency}
      validUntil={proposal.validUntil.toISOString()}
      notes={proposal.notes}
      initialStatus={effectiveStatus}
      acceptedAt={proposal.acceptedAt?.toISOString() ?? null}
    />
  );
}
