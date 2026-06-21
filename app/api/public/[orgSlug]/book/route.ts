import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createTapCharge } from "@/lib/tap";
import { decryptField } from "@/lib/encryption";

const publicBookingSchema = z.object({
  resourceId: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  guestName: z.string().min(1, "Name is required").max(100),
  guestEmail: z.string().email("Valid email is required"),
  guestPhone: z.string().max(20).optional(),
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
 * If payment is configured, initiates a Tap charge and returns a checkoutUrl.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  // Throttle unauthenticated booking creation per IP
  const limit = rateLimit(req, { key: `public-book:${params.orgSlug}`, limit: 8, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const org = await prisma.organization.findUnique({
    where: { slug: params.orgSlug },
    select: { id: true, name: true, currency: true, timezone: true, tapSecretKey: true },
  });
  if (!org) return apiError("Organization not found", 404);

  const body = await req.json();
  const parsed = publicBookingSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { resourceId, startTime, endTime, guestName, guestEmail, guestPhone, purpose, attendees } = parsed.data;

  // Verify resource belongs to this org, is active, and has external booking enabled
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, organizationId: org.id, isActive: true, deletedAt: null, externalBookingEnabled: true },
    select: {
      id: true, name: true, type: true,
      hourlyRate: true, halfDayRate: true, fullDayRate: true,
      externalHourlyRate: true,
      capacity: true, minBookingMinutes: true, maxBookingHours: true,
    },
  });
  if (!resource) return apiError("Resource not available for public booking", 404);

  // Validate duration against resource constraints
  const durationMins = (endTime.getTime() - startTime.getTime()) / 60000;
  if (durationMins < resource.minBookingMinutes) {
    return apiError(`Minimum booking duration is ${resource.minBookingMinutes} minutes`);
  }
  if (durationMins > resource.maxBookingHours * 60) {
    return apiError(`Maximum booking duration is ${resource.maxBookingHours} hours`);
  }

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

  // Compute amount — use externalHourlyRate if set, else fall back to member rate
  const durationHours = durationMins / 60;
  let amount = 0;
  const extHourly = resource.externalHourlyRate ? Number(resource.externalHourlyRate) : null;
  const memberHourly = resource.hourlyRate ? Number(resource.hourlyRate) : null;
  const hourlyRate = extHourly ?? memberHourly;

  if (hourlyRate) {
    amount = Math.round(hourlyRate * durationHours * 100) / 100;
  } else if (resource.fullDayRate && durationHours >= 7) {
    amount = Number(resource.fullDayRate);
  } else if (resource.halfDayRate && durationHours >= 3.5) {
    amount = Number(resource.halfDayRate);
  }

  // Find org owner userId (required FK)
  const ownerLink = await prisma.userOrganization.findFirst({
    where: { organizationId: org.id, role: "OWNER" },
    select: { userId: true },
  });
  if (!ownerLink) return apiError("Organization setup incomplete", 500);

  const booking = await prisma.booking.create({
    data: {
      organizationId: org.id,
      resourceId,
      userId: ownerLink.userId,
      memberId: null,
      title: purpose ?? `Guest booking — ${guestName}`,
      description: [
        `Guest: ${guestName} <${guestEmail}>`,
        guestPhone ? `Phone: ${guestPhone}` : null,
        purpose ? `Purpose: ${purpose}` : null,
      ].filter(Boolean).join("\n"),
      startTime,
      endTime,
      attendees,
      status: "PENDING",
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

  // If amount > 0, initiate Tap payment
  if (amount > 0) {
    const tapKey = decryptField(org.tapSecretKey) ?? process.env.TAP_SECRET_KEY;
    if (tapKey) {
      try {
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
        const webhookUrl = `${appUrl}/api/webhooks/tap`;
        const charge = await createTapCharge({
          amount,
          currency: org.currency,
          description: `Booking: ${resource.name} at ${org.name}`,
          customerName: guestName,
          customerEmail: guestEmail,
          redirectUrl: `${appUrl}/${params.orgSlug}/book?bookingId=${booking.id}&status=success`,
          postUrl: webhookUrl,
          metadata: {
            type: "PUBLIC_BOOKING",
            bookingId: booking.id,
            organizationId: org.id,
          },
        }, tapKey);

        if (charge?.transaction?.url) {
          return apiSuccess({
            bookingId: booking.id,
            resourceName: booking.resource.name,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            checkoutUrl: charge.transaction.url,
          }, 201);
        }
      } catch (err) {
        console.error("[public-book] Tap charge failed:", err);
        // Fall through — booking is created in PENDING, operator follows up
      }
    }
  }

  return apiSuccess({
    bookingId: booking.id,
    resourceName: booking.resource.name,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    checkoutUrl: null,
    message: amount > 0
      ? "Booking received. The operator will contact you with payment details."
      : "Booking received! The space operator will confirm shortly.",
  }, 201);
}
