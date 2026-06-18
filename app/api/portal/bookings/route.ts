import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { computeCharge, settleBooking } from "@/lib/booking-pricing";
import { validateWithinOpeningHours } from "@/lib/opening-hours";
import { sendBookingConfirmation } from "@/lib/email";
import { apiError, apiSuccess, getBaseUrl } from "@/lib/utils";
import { createCalendarEvent } from "@/lib/google-calendar";
import { checkinUrl } from "@/lib/checkin-token";
import { computeInvoiceTotals } from "@/lib/jurisdiction";
import { createTapCharge } from "@/lib/tap";
import { format } from "date-fns";

async function getMember(userId: string) {
  return prisma.member.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true, organizationId: true, credits: true },
  });
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const member = await getMember(user.id);
  if (!member) return apiError("Member not found", 404);

  const sp = req.nextUrl.searchParams;
  const upcoming = sp.get("upcoming") === "true";

  const now = new Date();

  const bookings = await prisma.booking.findMany({
    where: {
      memberId: member.id,
      organizationId: member.organizationId,
      deletedAt: null,
      ...(upcoming && { startTime: { gte: now } }),
    },
    include: {
      resource: {
        select: {
          id: true,
          name: true,
          type: true,
          location: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { startTime: "desc" },
  });

  return apiSuccess(bookings);
}

const createPortalBookingSchema = z
  .object({
    resourceId: z.string().min(1, "Resource is required"),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    title: z.string().max(100).optional().nullable(),
    attendees: z.number().int().min(1).max(500).default(1),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine(
    (d) => (d.endTime.getTime() - d.startTime.getTime()) >= 30 * 60 * 1000,
    { message: "Minimum booking duration is 30 minutes", path: ["endTime"] }
  )
  .refine(
    (d) => d.startTime > new Date(),
    { message: "Booking start time must be in the future", path: ["startTime"] }
  );

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const member = await getMember(user.id);
  if (!member) return apiError("Member not found", 404);

  const body = await req.json().catch(() => ({}));
  const parsed = createPortalBookingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { resourceId, startTime, endTime, title, attendees } = parsed.data;

  // Verify resource belongs to the member's organization and is active.
  const resource = await prisma.resource.findFirst({
    where: {
      id: resourceId,
      organizationId: member.organizationId,
      isActive: true,
      deletedAt: null,
    },
    include: {
      location: { select: { openingHours: true, timezone: true } },
      organization: {
        select: { timezone: true, currency: true, jurisdiction: true, paymentProvider: true },
      },
    },
  });
  if (!resource) return apiError("Resource not found", 404);

  // Capacity check
  if (attendees > resource.capacity) {
    return apiError(`This resource holds up to ${resource.capacity} people`, 400);
  }

  // Opening-hours check
  const hoursError = validateWithinOpeningHours(
    resource.location?.openingHours,
    resource.location?.timezone ?? resource.organization.timezone,
    startTime,
    endTime
  );
  if (hoursError) return apiError(hoursError, 422);

  // Advance booking check
  const maxAdvanceMs = resource.advanceBookingDays * 24 * 60 * 60 * 1000;
  if (startTime.getTime() - Date.now() > maxAdvanceMs) {
    return apiError(
      `This resource can only be booked up to ${resource.advanceBookingDays} days in advance`,
      400
    );
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
  if (conflict) {
    return apiError("Resource already booked for that time", 409);
  }

  // Pricing + credit settlement
  const { amount, creditsNeeded } = computeCharge(resource, startTime, endTime);
  const { creditsUsed, amountCharged } = settleBooking({
    amount, creditsNeeded, memberCredits: member.credits,
  });

  // Fetch user's Google Calendar token
  const userRow = await prisma.user.findUnique({
    where: { id: user.id },
    select: { googleCalendarRefreshToken: true, name: true, email: true },
  });

  const booking = await prisma.$transaction(async (tx) => {
    if (creditsUsed > 0) {
      await tx.member.update({
        where: { id: member.id },
        data: { credits: { decrement: creditsUsed } },
      });
    }
    return tx.booking.create({
      data: {
        organizationId: member.organizationId,
        resourceId,
        memberId: member.id,
        userId: user.id,
        title: title ?? null,
        startTime,
        endTime,
        attendees,
        status: resource.requiresApproval ? "PENDING" : "CONFIRMED",
        amountCharged,
        creditsUsed,
      },
      include: {
        resource: {
          select: {
            id: true, name: true, type: true,
            location: { select: { id: true, name: true } },
          },
        },
        organization: { select: { name: true, currency: true, timezone: true } },
      },
    });
  });

  // Google Calendar event (fire-and-forget)
  if (userRow?.googleCalendarRefreshToken && booking.status === "CONFIRMED") {
    void createCalendarEvent(userRow.googleCalendarRefreshToken, {
      title: booking.title ?? booking.resource.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      timezone: booking.organization.timezone,
      resourceName: booking.resource.name,
      orgName: booking.organization.name,
    }).then((eventId) => {
      if (eventId) {
        return prisma.booking.update({
          where: { id: booking.id },
          data: { googleCalendarEventId: eventId },
        });
      }
    });
  }

  // Confirmation email (fire-and-forget)
  if (user.email) {
    void sendBookingConfirmation({
      to: user.email,
      memberName: user.user_metadata?.name ?? null,
      orgName: booking.organization.name,
      resourceName: booking.resource.name,
      start: booking.startTime,
      end: booking.endTime,
      amountCharged: Number(booking.amountCharged),
      creditsUsed: booking.creditsUsed,
      currency: booking.organization.currency,
      status: booking.status,
    });
  }

  const baseUrl = getBaseUrl();
  const qrUrl = checkinUrl(booking.id, baseUrl);

  // If there's a cash charge, create an invoice and initiate payment
  if (Number(amountCharged) > 0) {
    try {
      const org = resource.organization;
      const durationHours = (endTime.getTime() - startTime.getTime()) / 3600000;
      const totals = computeInvoiceTotals(Number(amountCharged), org.jurisdiction);

      const count = await prisma.invoice.count({ where: { organizationId: member.organizationId } });
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invoice = await prisma.invoice.create({
        data: {
          organizationId: member.organizationId,
          memberId: member.id,
          invoiceNumber,
          amount: totals.totalAmount,
          subtotal: totals.subtotal,
          vatRate: totals.vatRate,
          vatAmount: totals.vatAmount,
          totalAmount: totals.totalAmount,
          currency: org.currency ?? "AED",
          status: "PENDING",
          dueDate,
          lineItems: [
            {
              description: `${booking.resource.name}${booking.title ? ` — ${booking.title}` : ""} (${format(startTime, "d MMM yyyy, HH:mm")}, ${durationHours.toFixed(1)}h)`,
              quantity: 1,
              unitPrice: Number(amountCharged),
              total: Number(amountCharged),
              bookingId: booking.id,
            },
          ],
        },
      });

      // Link booking to this invoice
      await prisma.booking.update({
        where: { id: booking.id },
        data: { invoiceId: invoice.id },
      });

      // Create Tap or Moyasar charge
      let checkoutUrl: string | null = null;

      if (org.paymentProvider !== "MOYASAR") {
        const charge = await createTapCharge({
          amount: totals.totalAmount,
          currency: org.currency ?? "AED",
          description: `Booking — ${booking.resource.name}`,
          metadata: {
            invoiceId: invoice.id,
            organizationId: member.organizationId,
            memberId: member.id,
            bookingId: booking.id,
          },
          customerEmail: userRow?.email ?? user.email ?? "",
          customerName: userRow?.name ?? user.user_metadata?.name ?? "Member",
          redirectUrl: `${baseUrl}/portal/invoices?tap_id={id}&tap_status={status}`,
          postUrl: `${baseUrl}/api/webhooks/tap`,
          referenceTransaction: `bk_${invoice.id.slice(-8)}`,
        });

        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { tapChargeId: charge.id },
        });

        checkoutUrl = charge.transaction.url;
      }

      return apiSuccess(
        { ...booking, checkinUrl: qrUrl, invoiceId: invoice.id, checkoutUrl },
        201
      );
    } catch (err) {
      console.error("[portal/bookings] Failed to create invoice/charge:", err);
      // Fall through — booking is created, member can pay from invoices page
    }
  }

  return apiSuccess({ ...booking, checkinUrl: qrUrl }, 201);
}
