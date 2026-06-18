import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MyBookingsView } from "@/components/portal/my-bookings-view";
import { checkinUrl } from "@/lib/checkin-token";
import { getBaseUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "My Bookings — Maktaby" };
export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
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

  const now = new Date();
  const baseUrl = getBaseUrl();

  const [upcoming, past] = await Promise.all([
    prisma.booking.findMany({
      where: {
        memberId: member.id,
        organizationId: member.organizationId,
        deletedAt: null,
        startTime: { gte: now },
      },
      include: {
        resource: {
          select: { id: true, name: true, type: true, location: { select: { name: true } } },
        },
      },
      orderBy: { startTime: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        memberId: member.id,
        organizationId: member.organizationId,
        deletedAt: null,
        startTime: { lt: now },
      },
      include: {
        resource: {
          select: { id: true, name: true, type: true, location: { select: { name: true } } },
        },
      },
      orderBy: { startTime: "desc" },
      take: 30,
    }),
  ]);

  const serialize = (b: typeof upcoming[0]) => ({
    ...b,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    amountCharged: Number(b.amountCharged),
    checkinUrl:
      b.status === "CONFIRMED" || b.status === "CHECKED_IN"
        ? checkinUrl(b.id, baseUrl)
        : null,
  });

  return (
    <MyBookingsView
      upcoming={upcoming.map(serialize) as any}
      past={past.map(serialize) as any}
    />
  );
}
