import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
import { z } from "zod";

const createSubscriptionSchema = z.object({
  memberId: z.string().cuid(),
  addressId: z.string().cuid(),
  companyName: z.string().min(1).max(200),
  licenseNumber: z.string().max(100).optional().nullable(),
  licenseExpiry: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional().nullable(),
  renewalDate: z.coerce.date().optional().nullable(),
  monthlyFee: z.number().min(0),
  currency: z.string().length(3).default("AED"),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const statusFilter = sp.get("status");
  const memberId = sp.get("memberId");

  const where: any = {
    organizationId: auth.organizationId,
    deletedAt: null,
    ...(statusFilter && { status: statusFilter }),
    ...(memberId && { memberId }),
  };

  const [subscriptions, total] = await Promise.all([
    prisma.virtualOfficeSubscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        member: { include: { user: { select: { name: true, email: true } } } },
        address: { select: { id: true, addressLine: true, addressType: true, jurisdiction: true } },
      },
    }),
    prisma.virtualOfficeSubscription.count({ where }),
  ]);

  return apiSuccess({ data: subscriptions, meta: buildPaginationMeta(total, page, limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createSubscriptionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const d = parsed.data;

  // Verify member and address belong to this org
  const [member, address] = await Promise.all([
    prisma.member.findFirst({ where: { id: d.memberId, organizationId: auth.organizationId, deletedAt: null } }),
    prisma.virtualOfficeAddress.findFirst({ where: { id: d.addressId, organizationId: auth.organizationId, deletedAt: null, isActive: true } }),
  ]);
  if (!member) return apiError("Member not found", 404);
  if (!address) return apiError("Address not found or inactive", 404);

  // Check address capacity
  const currentCount = await prisma.virtualOfficeSubscription.count({
    where: { addressId: d.addressId, status: "ACTIVE", deletedAt: null },
  });
  if (currentCount >= address.maxClients) return apiError("Address is at full capacity", 409);

  const subscription = await prisma.virtualOfficeSubscription.create({
    data: {
      organizationId: auth.organizationId,
      memberId: d.memberId,
      addressId: d.addressId,
      companyName: d.companyName,
      licenseNumber: d.licenseNumber ?? null,
      licenseExpiry: d.licenseExpiry ?? null,
      startDate: d.startDate ?? new Date(),
      endDate: d.endDate ?? null,
      renewalDate: d.renewalDate ?? null,
      monthlyFee: d.monthlyFee,
      currency: d.currency,
      notes: d.notes ?? null,
    },
    include: {
      member: { include: { user: { select: { name: true, email: true } } } },
      address: { select: { id: true, addressLine: true, addressType: true } },
    },
  });

  return apiSuccess(subscription, 201);
}
