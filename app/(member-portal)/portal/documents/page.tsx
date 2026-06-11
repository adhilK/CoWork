import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { serializeDocument } from "@/lib/documents";
import { MemberDocumentsView } from "@/components/documents/member-documents-view";

export const metadata: Metadata = { title: "My Documents — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function PortalDocumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, organizationId: true },
  });
  if (!member) redirect("/login");

  const [documents, requests] = await Promise.all([
    prisma.document.findMany({
      where: { memberId: member.id, organizationId: member.organizationId, deletedAt: null },
      orderBy: [{ expiryDate: "asc" }, { uploadedAt: "desc" }],
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.documentRequest.findMany({
      where: { memberId: member.id, organizationId: member.organizationId, deletedAt: null, status: { in: ["PENDING", "OVERDUE"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const now = Date.now();
  const serializedRequests = requests.map((r) => ({
    id: r.id,
    documentType: r.documentType,
    message: r.message,
    dueDate: r.dueDate,
    status: r.status === "PENDING" && r.dueDate && new Date(r.dueDate).getTime() < now ? "OVERDUE" : r.status,
  }));

  return (
    <MemberDocumentsView
      documents={documents.map(serializeDocument) as any}
      requests={serializedRequests as any}
    />
  );
}
