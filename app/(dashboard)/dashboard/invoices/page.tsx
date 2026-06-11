import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { InvoicesView } from "@/components/invoices/invoices-view";
import { getVatRate } from "@/lib/jurisdiction";

export const metadata: Metadata = { title: "Invoices — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: { page?: string; status?: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const userOrg = { organizationId: ctx.organizationId, organization: ctx.organization };

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const limit = 20;
  const skip = (page - 1) * limit;
  const status = searchParams.status;

  const where = {
    organizationId: userOrg.organizationId,
    deletedAt: null,
    ...(status && status !== "all" && { status: status as any }),
  };

  const [invoices, total, summary, members, unbilledBookings] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { organizationId: userOrg.organizationId, deletedAt: null },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.member.findMany({
      where: { organizationId: userOrg.organizationId, status: "ACTIVE", deletedAt: null },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Bookings with a charge that haven't been invoiced yet
    prisma.booking.findMany({
      where: {
        organizationId: userOrg.organizationId,
        deletedAt: null,
        invoiceId: null,
        amountCharged: { gt: 0 },
        status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
      },
      include: {
        resource: { select: { id: true, name: true } },
        member: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { startTime: "desc" },
    }),
  ]);

  return (
    <InvoicesView
      invoices={invoices as any}
      total={total}
      page={page}
      limit={limit}
      summary={summary as any}
      currency={userOrg.organization.currency}
      vatRate={getVatRate(userOrg.organization.jurisdiction)}
      members={members as any}
      organizationId={userOrg.organizationId}
      unbilledBookings={unbilledBookings as any}
    />
  );
}
