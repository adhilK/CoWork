import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { PublicBookingPage } from "@/components/public/public-booking-page";

type Props = { params: { orgSlug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const org = await prisma.organization.findUnique({
    where: { slug: params.orgSlug },
    select: { name: true },
  });
  return {
    title: org ? `Book a space — ${org.name}` : "Book a space",
  };
}

export const dynamic = "force-dynamic";

export default async function PublicBookPage({ params }: Props) {
  const org = await prisma.organization.findUnique({
    where: { slug: params.orgSlug },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      address: true,
      currency: true,
      timezone: true,
      paymentProvider: true,
      tapSecretKey: true,
    },
  });

  if (!org) notFound();

  const resources = await prisma.resource.findMany({
    where: {
      organizationId: org.id,
      isActive: true,
      deletedAt: null,
      externalBookingEnabled: true,
    },
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      capacity: true,
      hourlyRate: true,
      halfDayRate: true,
      fullDayRate: true,
      externalHourlyRate: true,
      amenities: true,
      images: true,
      minBookingMinutes: true,
      maxBookingHours: true,
      advanceBookingDays: true,
    },
    orderBy: { name: "asc" },
  });

  // Serialize Decimal → number
  const serialized = resources.map((r) => ({
    ...r,
    hourlyRate: r.hourlyRate ? Number(r.hourlyRate) : null,
    halfDayRate: r.halfDayRate ? Number(r.halfDayRate) : null,
    fullDayRate: r.fullDayRate ? Number(r.fullDayRate) : null,
    externalHourlyRate: r.externalHourlyRate ? Number(r.externalHourlyRate) : null,
  }));

  const paymentEnabled = !!(org.tapSecretKey || process.env.TAP_SECRET_KEY);

  return (
    <PublicBookingPage
      org={{ id: org.id, name: org.name, slug: org.slug, logo: org.logo, address: org.address, currency: org.currency, timezone: org.timezone }}
      resources={serialized}
      paymentEnabled={paymentEnabled}
    />
  );
}
