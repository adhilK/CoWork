import type { Metadata } from "next";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BookingsView } from "@/components/bookings/bookings-view";

export const metadata: Metadata = { title: "Bookings — Maktaby" };
export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organizationId;

  const now = new Date();
  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [resources, members, upcoming] = await Promise.all([
    prisma.resource.findMany({
      where: { organizationId: orgId, isActive: true, deletedAt: null },
      select: { id: true, name: true, type: true, capacity: true, hourlyRate: true },
      orderBy: { name: "asc" },
    }),
    prisma.member.findMany({
      where: { organizationId: orgId, status: "ACTIVE", deletedAt: null },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Upcoming + in-progress bookings for the default Schedule view.
    prisma.booking.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
        endTime: { gte: now },
        startTime: { lte: in14Days },
      },
      select: {
        id: true, title: true, startTime: true, endTime: true, status: true,
        attendees: true, amountCharged: true,
        resource: { select: { id: true, name: true, type: true } },
        member: { select: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  // Serialize for the client (Decimal → number, Date → ISO string)
  const upcomingBookings = upcoming.map((b) => ({
    id: b.id,
    title: b.title,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status,
    attendees: b.attendees,
    amountCharged: Number(b.amountCharged ?? 0),
    resourceId: b.resource.id,
    resourceName: b.resource.name,
    resourceType: b.resource.type,
    memberName: b.member?.user?.name ?? b.member?.user?.email ?? null,
  }));

  return (
    <BookingsView
      resources={resources}
      members={members}
      currency={ctx.organization.currency}
      timezone={ctx.organization.timezone}
      upcomingBookings={upcomingBookings}
    />
  );
}
