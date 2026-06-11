import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LocationsView } from "@/components/locations/locations-view";

export const metadata: Metadata = { title: "Locations — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [locations, orgUsers, org] = await Promise.all([
    prisma.location.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { resources: { where: { deletedAt: null } } } } },
    }),
    prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      select: { userId: true, role: true, user: { select: { name: true, email: true } } },
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { allowCrossLocationBooking: true },
    }),
  ]);

  const locationIds = locations.map((l) => l.id);
  const bookings = locationIds.length
    ? await prisma.booking.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          startTime: { gte: monthStart },
          resource: { locationId: { in: locationIds } },
        },
        select: { amountCharged: true, status: true, resource: { select: { locationId: true } } },
      })
    : [];

  const statsByLocation: Record<string, { bookings: number; revenue: number }> = {};
  for (const b of bookings) {
    const lid = b.resource.locationId;
    if (!statsByLocation[lid]) statsByLocation[lid] = { bookings: 0, revenue: 0 };
    statsByLocation[lid]!.bookings += 1;
    if (b.status !== "CANCELLED" && b.status !== "NO_SHOW") {
      statsByLocation[lid]!.revenue += Number(b.amountCharged);
    }
  }

  const userMap = new Map(orgUsers.map((u) => [u.userId, u.user]));

  const data = locations.map((l) => {
    const { wifiPassword, openingHours, ...rest } = l;
    return {
      ...rest,
      openingHours: openingHours as any,
      hasWifiPassword: !!wifiPassword,
      resourceCount: l._count.resources,
      managerName: l.managerUserId ? userMap.get(l.managerUserId)?.name ?? null : null,
      bookingsThisMonth: statsByLocation[l.id]?.bookings ?? 0,
      revenueThisMonth: statsByLocation[l.id]?.revenue ?? 0,
    };
  });

  const managers = orgUsers
    .filter((u) => u.role !== "MEMBER")
    .map((u) => ({ id: u.userId, name: u.user.name, email: u.user.email }));

  return (
    <LocationsView
      locations={data as any}
      managers={managers as any}
      currency={ctx.organization.currency}
      allowCrossLocationBooking={org?.allowCrossLocationBooking ?? true}
    />
  );
}
