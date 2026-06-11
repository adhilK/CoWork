import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { encryptField } from "@/lib/encryption";
import { z } from "zod";

const openingHoursSchema = z
  .record(
    z.string(),
    z.object({
      open: z.string().optional(),
      close: z.string().optional(),
      closed: z.boolean().optional(),
    })
  )
  .optional()
  .nullable();

const createLocationSchema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  jurisdiction: z.enum(["UAE", "KSA"]).default("UAE"),
  timezone: z.string().max(60).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  vatNumber: z.string().max(30).optional().nullable(),
  managerUserId: z.string().optional().nullable(),
  openingHours: openingHoursSchema,
  accessInstructions: z.string().max(2000).optional().nullable(),
  wifiName: z.string().max(120).optional().nullable(),
  wifiPassword: z.string().max(200).optional().nullable(),
  floorPlanUrl: z.string().url().optional().or(z.literal("")).nullable(),
  parentLocationId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [locations, orgUsers] = await Promise.all([
    prisma.location.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { resources: { where: { deletedAt: null } } } } },
    }),
    prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      select: { userId: true, role: true, user: { select: { name: true, email: true } } },
    }),
  ]);

  // Per-location booking stats this month (bookings → resource → location).
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
    const { wifiPassword, ...rest } = l;
    return {
      ...rest,
      hasWifiPassword: !!wifiPassword,
      resourceCount: l._count.resources,
      managerName: l.managerUserId ? userMap.get(l.managerUserId)?.name ?? null : null,
      managerEmail: l.managerUserId ? userMap.get(l.managerUserId)?.email ?? null : null,
      bookingsThisMonth: statsByLocation[l.id]?.bookings ?? 0,
      revenueThisMonth: statsByLocation[l.id]?.revenue ?? 0,
    };
  });

  const managers = orgUsers
    .filter((u) => u.role !== "MEMBER")
    .map((u) => ({ id: u.userId, name: u.user.name, email: u.user.email }));

  return apiSuccess({ data, managers });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const body = await req.json();
  const parsed = createLocationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  // Validate manager belongs to org (if set)
  if (d.managerUserId) {
    const member = await prisma.userOrganization.findFirst({
      where: { organizationId: orgId, userId: d.managerUserId },
    });
    if (!member) return apiError("Manager must be a member of this organization", 400);
  }
  // Validate parent location belongs to org (if set)
  if (d.parentLocationId) {
    const parent = await prisma.location.findFirst({
      where: { id: d.parentLocationId, organizationId: orgId, deletedAt: null },
    });
    if (!parent) return apiError("Parent location not found", 404);
  }

  const location = await prisma.location.create({
    data: {
      organizationId: orgId,
      name: d.name,
      address: d.address ?? null,
      city: d.city ?? null,
      country: d.country ?? null,
      jurisdiction: d.jurisdiction,
      timezone: d.timezone ?? null,
      phone: d.phone ?? null,
      email: d.email || null,
      vatNumber: d.vatNumber ?? null,
      managerUserId: d.managerUserId ?? null,
      openingHours: d.openingHours ?? undefined,
      accessInstructions: d.accessInstructions ?? null,
      wifiName: d.wifiName ?? null,
      wifiPassword: encryptField(d.wifiPassword ?? null),
      floorPlanUrl: d.floorPlanUrl || null,
      parentLocationId: d.parentLocationId ?? null,
      isActive: d.isActive,
    },
  });

  return apiSuccess(location, 201);
}
