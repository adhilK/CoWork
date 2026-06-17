import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";
import { computeCharge } from "@/lib/booking-pricing";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const publicBookingSchema = z.object({
  resourceId: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  guestName: z.string().min(1, "Name is required").max(100),
  guestEmail: z.string().email("Valid email is required"),
  purpose: z.string().max(300).optional(),
  attendees: z.number().int().min(1).max(500).default(1),
}).refine((d) => d.endTime > d.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
}).refine((d) => {
  const mins = (d.endTime.getTime() - d.startTime.getTime()) / 60000;
  return mins >= 30;
}, { message: "Minimum booking is 30 minutes", path: ["endTime"] });

/**
 * POST /api/public/[orgSlug]/book
 * Creates a PENDING booking from a public (unauthenticated) visitor.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  // Throttle unauthenticated booking creation per IP — prevents flooding an
  // org's calendar with junk PENDING bookings.
  const limit = rateLimit(req, { key: `public-book:${params.orgSlug}`, limit: 8, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const org = await prisma.organization.findUnique({
    where: { slug: params.orgSlug },
    select: { id: true, name: true, currency: true, timezone: true },
  });
  if (!org) return apiError("Organization not found", 404);

  const body = await req.json();
  const parsed = publicBookingSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { resourceId, startTime, endTime, guestName, guestEmail, purpose, attendees } = parsed.data;

  // Verify resource belongs to this org and is active
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, organizationId: org.id, isActive: true, deletedAt: null },
  });
  if (!resource) return apiError("Resource not found", 404);

  // Conflict check
  const conflict = await prisma.booking.findFirst({
    where: {
      resourceId,
      deletedAt: null,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  });
  if (conflict) return apiError("This resource is already booked for that time slot", 409);

  // Compute pricing (no credits — public guest)
  const { amount } = computeCharge(resource, startTime, endTime);

  // Find or create a system user for the org to satisfy userId FK
  // We use the org owner's userId for public bookings
  const ownerLink = await prisma.userOrganization.findFirst({
    where: { organizationId: org.id, role: "OWNER" },
    select: { userId: true },
  });
  if (!ownerLink) return apiError("Organization setup incomplete", 500);

  const booking = await prisma.booking.create({
    data: {
      organizationId: org.id,
      resourceId,
      userId: ownerLink.userId, // required FK — public bookings attributed to org owner
      memberId: null,
      title: purpose ?? `Guest booking — ${guestName}`,
      description: `Guest: ${guestName} <${guestEmail}>${purpose ? `\nPurpose: ${purpose}` : ""}`,
      startTime,
      endTime,
      attendees,
      status: "PENDING", // always pending — admin must approve public bookings
      amountCharged: amount,
      creditsUsed: 0,
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      resource: { select: { name: true } },
    },
  });

  return apiSuccess({
    bookingId: booking.id,
    resourceName: booking.resource.name,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    message: "Booking received! The space operator will confirm shortly.",
  }, 201);
}
