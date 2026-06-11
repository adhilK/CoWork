import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { encryptField, decryptField } from "@/lib/encryption";
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

const updateLocationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  jurisdiction: z.enum(["UAE", "KSA"]).optional(),
  timezone: z.string().max(60).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  vatNumber: z.string().max(30).optional().nullable(),
  managerUserId: z.string().optional().nullable(),
  openingHours: openingHoursSchema,
  accessInstructions: z.string().max(2000).optional().nullable(),
  wifiName: z.string().max(120).optional().nullable(),
  // wifiPassword: only re-encrypt when a new value is sent.
  wifiPassword: z.string().max(200).optional().nullable(),
  floorPlanUrl: z.string().url().optional().or(z.literal("")).nullable(),
  parentLocationId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// Returns the location WITH the decrypted wifi password (staff-only endpoint).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const location = await prisma.location.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: {
      resources: {
        where: { deletedAt: null },
        select: { id: true, name: true, type: true, capacity: true, isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!location) return apiError("Location not found", 404);

  const { wifiPassword, ...rest } = location;
  return apiSuccess({ ...rest, wifiPassword: decryptField(wifiPassword) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const location = await prisma.location.findFirst({
    where: { id: params.id, organizationId: orgId, deletedAt: null },
  });
  if (!location) return apiError("Location not found", 404);

  const body = await req.json();
  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  if (d.managerUserId) {
    const member = await prisma.userOrganization.findFirst({
      where: { organizationId: orgId, userId: d.managerUserId },
    });
    if (!member) return apiError("Manager must be a member of this organization", 400);
  }
  if (d.parentLocationId) {
    if (d.parentLocationId === params.id) return apiError("A location cannot be its own parent");
    const parent = await prisma.location.findFirst({
      where: { id: d.parentLocationId, organizationId: orgId, deletedAt: null },
    });
    if (!parent) return apiError("Parent location not found", 404);
  }

  const data: any = {};
  const assign = (k: keyof typeof d, mapNullable = true) => {
    if (d[k] !== undefined) data[k] = mapNullable ? (d[k] === "" ? null : d[k]) : d[k];
  };
  assign("name");
  assign("address");
  assign("city");
  assign("country");
  if (d.jurisdiction !== undefined) data.jurisdiction = d.jurisdiction;
  assign("timezone");
  assign("phone");
  if (d.email !== undefined) data.email = d.email || null;
  assign("vatNumber");
  if (d.managerUserId !== undefined) data.managerUserId = d.managerUserId || null;
  if (d.openingHours !== undefined) data.openingHours = d.openingHours ?? undefined;
  assign("accessInstructions");
  assign("wifiName");
  if (d.wifiPassword !== undefined) data.wifiPassword = encryptField(d.wifiPassword || null);
  if (d.floorPlanUrl !== undefined) data.floorPlanUrl = d.floorPlanUrl || null;
  if (d.parentLocationId !== undefined) data.parentLocationId = d.parentLocationId || null;
  if (d.isActive !== undefined) data.isActive = d.isActive;

  const updated = await prisma.location.update({ where: { id: params.id }, data });
  const { wifiPassword, ...rest } = updated;
  return apiSuccess({ ...rest, wifiPassword: decryptField(wifiPassword) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const location = await prisma.location.findFirst({
    where: { id: params.id, organizationId: orgId, deletedAt: null },
  });
  if (!location) return apiError("Location not found", 404);

  // Block deletion while active resources are attached — they must be moved first.
  const activeResources = await prisma.resource.count({
    where: { locationId: params.id, deletedAt: null },
  });
  if (activeResources > 0) {
    return apiError(`Move or remove the ${activeResources} resource(s) at this location first`, 409);
  }

  // Don't allow deleting the last location (resources need somewhere to live).
  const remaining = await prisma.location.count({
    where: { organizationId: orgId, deletedAt: null },
  });
  if (remaining <= 1) return apiError("You must keep at least one location", 409);

  await prisma.location.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false },
  });

  return apiSuccess({ success: true });
}
