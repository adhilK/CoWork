import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeDocument } from "@/lib/documents";
import { DocumentsView } from "@/components/documents/documents-view";

export const metadata: Metadata = { title: "Document Vault — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;

  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [documents, members, requests, expiringCount, verifiedCount] = await Promise.all([
    prisma.document.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: [{ expiryDate: "asc" }, { uploadedAt: "desc" }],
      take: 300,
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.member.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.documentRequest.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.document.count({
      where: { organizationId: orgId, deletedAt: null, expiryDate: { not: null, lte: in30 } },
    }),
    prisma.document.count({
      where: { organizationId: orgId, deletedAt: null, isVerified: true },
    }),
  ]);

  const now = Date.now();
  const serializedRequests = requests.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    documentType: r.documentType,
    message: r.message,
    dueDate: r.dueDate,
    status:
      r.status === "PENDING" && r.dueDate && new Date(r.dueDate).getTime() < now ? "OVERDUE" : r.status,
    createdAt: r.createdAt,
    member: { id: r.member.id, name: r.member.user.name, email: r.member.user.email },
  }));

  return (
    <DocumentsView
      documents={documents.map(serializeDocument) as any}
      members={members.map((m) => ({ id: m.id, name: m.user.name, email: m.user.email })) as any}
      requests={serializedRequests as any}
      stats={{
        total: documents.length,
        expiring: expiringCount,
        pendingRequests: serializedRequests.filter((r) => r.status === "PENDING" || r.status === "OVERDUE").length,
        verified: verifiedCount,
      }}
    />
  );
}
