import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ResourcesView } from "@/components/resources/resources-view";

export const metadata: Metadata = { title: "Resources — Maktaby" };
export const dynamic = "force-dynamic";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: { location?: string };
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const userOrg = { organizationId: ctx.organizationId, organization: ctx.organization };

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Optional location scoping (from the Locations module "View resources" links).
  const locationFilter = searchParams.location
    ? { locationId: searchParams.location }
    : {};

  const [resources, locations, upcomingBookings] = await Promise.all([
    prisma.resource.findMany({
      where: { organizationId: userOrg.organizationId, deletedAt: null, ...locationFilter },
      include: { location: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { organizationId: userOrg.organizationId, isActive: true },
    }),
    prisma.booking.findMany({
      where: {
        organizationId: userOrg.organizationId,
        status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING"] },
        endTime: { gte: now },
        startTime: { lte: in30Days },
        deletedAt: null,
      },
      select: { resourceId: true, startTime: true, endTime: true, status: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  // Build per-resource availability snapshot
  const availabilityMap: Record<string, {
    currentBookingEnd: Date | null;
    nextBookingStart: Date | null;
    nextBookingEnd: Date | null;
    bookedUntil: Date | null; // furthest booking end in next 30 days
  }> = {};

  for (const b of upcomingBookings) {
    if (!availabilityMap[b.resourceId]) {
      availabilityMap[b.resourceId] = {
        currentBookingEnd: null,
        nextBookingStart: null,
        nextBookingEnd: null,
        bookedUntil: null,
      };
    }
    const entry = availabilityMap[b.resourceId]!;
    const isNow = b.startTime <= now && b.endTime > now;
    if (isNow && !entry.currentBookingEnd) {
      entry.currentBookingEnd = b.endTime;
    } else if (!isNow && !entry.nextBookingStart) {
      entry.nextBookingStart = b.startTime;
      entry.nextBookingEnd = b.endTime;
    }
    if (!entry.bookedUntil || b.endTime > entry.bookedUntil) {
      entry.bookedUntil = b.endTime;
    }
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const publicBookingUrl = appUrl && ctx.organization?.slug
    ? `${appUrl}/${ctx.organization.slug}/book`
    : null;

  return (
    <ResourcesView
      resources={resources as any}
      locations={locations}
      currency={userOrg.organization.currency}
      organizationId={userOrg.organizationId}
      availabilityMap={availabilityMap}
      publicBookingUrl={publicBookingUrl}
    />
  );
}
