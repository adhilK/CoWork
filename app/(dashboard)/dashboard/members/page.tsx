import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MembersTable } from "@/components/members/members-table";

export const metadata: Metadata = { title: "Members — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function MembersPage({ searchParams }: { searchParams: { page?: string; search?: string; status?: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const userOrg = { organizationId: ctx.organizationId, organization: ctx.organization };

  const page = Math.max(1, Number(searchParams.page ?? 1));
  const limit = 20;
  const skip = (page - 1) * limit;
  const search = searchParams.search?.trim();
  const status = searchParams.status;

  const where = {
    organizationId: userOrg.organizationId,
    deletedAt: null,
    ...(status && status !== "all" && { status: status as any }),
    ...(search && {
      OR: [
        { user: { name: { contains: search, mode: "insensitive" as const } } },
        { user: { email: { contains: search, mode: "insensitive" as const } } },
        { company: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [members, total, plans] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        user: true,
        membershipPlan: { select: { id: true, name: true, price: true, billingCycle: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.member.count({ where }),
    prisma.membershipPlan.findMany({
      where: { organizationId: userOrg.organizationId, isActive: true },
      select: { id: true, name: true, price: true },
      orderBy: { price: "asc" },
    }),
  ]);

  return (
    <MembersTable
      members={members as any}
      total={total}
      page={page}
      limit={limit}
      currency={userOrg.organization.currency}
      plans={plans}
      organizationId={userOrg.organizationId}
    />
  );
}
