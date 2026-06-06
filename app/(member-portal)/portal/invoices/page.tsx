import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MyInvoicesView } from "@/components/portal/my-invoices-view";

export const metadata: Metadata = { title: "Invoices — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, organizationId: true },
  });
  if (!member) redirect("/login");

  const invoices = await prisma.invoice.findMany({
    where: { memberId: member.id, organizationId: member.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const serialized = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    amount: Number(inv.amount),
    currency: inv.currency,
    status: inv.status,
    dueDate: inv.dueDate.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null,
    periodStart: inv.periodStart?.toISOString() ?? null,
    periodEnd: inv.periodEnd?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
  }));

  return <MyInvoicesView invoices={serialized} />;
}
