import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ResourceBrowser } from "@/components/portal/resource-browser";

export const metadata: Metadata = { title: "Book a Space — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function BookPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { organizationId: true, organization: { select: { currency: true } } },
  });
  if (!member) redirect("/login");

  // Fetch the bookable spaces server-side, scoped to the member's org. This is
  // more reliable than a client fetch to /api/resources (which depends on the
  // session cookie resolving) and removes a round-trip — fixing the spurious
  // "no spaces found" some members saw.
  const resources = await prisma.resource.findMany({
    where: { organizationId: member.organizationId, deletedAt: null, isActive: true },
    include: { location: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const initialResources = resources.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    description: r.description,
    capacity: r.capacity,
    hourlyRate: r.hourlyRate == null ? null : Number(r.hourlyRate),
    halfDayRate: r.halfDayRate == null ? null : Number(r.halfDayRate),
    fullDayRate: r.fullDayRate == null ? null : Number(r.fullDayRate),
    amenities: r.amenities,
    requiresApproval: r.requiresApproval,
    isActive: r.isActive,
    location: r.location ? { name: r.location.name } : null,
  }));

  return (
    <ResourceBrowser
      currency={member.organization.currency}
      initialResources={initialResources}
    />
  );
}
