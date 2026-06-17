import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { startOfDay, endOfDay } from "date-fns";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/public/[orgSlug]/availability?resourceId=xxx&date=2026-06-15
 * Returns booked intervals for a resource on a given day.
 * Public — no auth required.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { orgSlug: string } }
) {
  const limit = rateLimit(req, { key: "public-availability", limit: 60, windowMs: 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const sp = req.nextUrl.searchParams;
  const resourceId = sp.get("resourceId");
  const date = sp.get("date"); // YYYY-MM-DD

  if (!resourceId || !date) return apiError("Missing resourceId or date");

  const org = await prisma.organization.findUnique({
    where: { slug: params.orgSlug },
    select: { id: true },
  });
  if (!org) return apiError("Organization not found", 404);

  const dayStart = startOfDay(new Date(date + "T00:00:00"));
  const dayEnd = endOfDay(new Date(date + "T23:59:59"));

  const bookings = await prisma.booking.findMany({
    where: {
      resourceId,
      organizationId: org.id,
      deletedAt: null,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      AND: [
        { startTime: { lt: dayEnd } },
        { endTime: { gt: dayStart } },
      ],
    },
    select: { startTime: true, endTime: true },
    orderBy: { startTime: "asc" },
  });

  return apiSuccess({ date, resourceId, booked: bookings });
}
