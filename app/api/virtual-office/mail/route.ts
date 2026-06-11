import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
import { z } from "zod";

const createMailSchema = z.object({
  addressId: z.string().cuid(),
  subscriptionId: z.string().cuid().optional().nullable(),
  senderName: z.string().max(200).optional().nullable(),
  senderAddress: z.string().max(500).optional().nullable(),
  receivedAt: z.coerce.date().optional(),
  mailType: z.enum(["LETTER", "PACKAGE", "LEGAL_DOCUMENT", "GOVERNMENT_CORRESPONDENCE", "COURIER", "OTHER"]).default("OTHER"),
  description: z.string().max(1000).optional().nullable(),
  trackingNumber: z.string().max(100).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const addressId = sp.get("addressId");
  const subscriptionId = sp.get("subscriptionId");
  const pending = sp.get("pending"); // items not yet collected

  const where: any = {
    organizationId: auth.organizationId,
    deletedAt: null,
    ...(addressId && { addressId }),
    ...(subscriptionId && { subscriptionId }),
    ...(pending === "true" && { collectedAt: null }),
  };

  const [mailItems, total] = await Promise.all([
    prisma.mailItem.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip,
      take: limit,
      include: {
        address: { select: { id: true, addressLine: true } },
        subscription: {
          select: {
            id: true,
            companyName: true,
            member: { include: { user: { select: { name: true, email: true } } } },
          },
        },
      },
    }),
    prisma.mailItem.count({ where }),
  ]);

  return apiSuccess({ data: mailItems, meta: buildPaginationMeta(total, page, limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createMailSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const d = parsed.data;

  const address = await prisma.virtualOfficeAddress.findFirst({
    where: { id: d.addressId, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!address) return apiError("Address not found", 404);

  if (d.subscriptionId) {
    const sub = await prisma.virtualOfficeSubscription.findFirst({
      where: { id: d.subscriptionId, organizationId: auth.organizationId, deletedAt: null },
    });
    if (!sub) return apiError("Subscription not found", 404);
  }

  const mailItem = await prisma.mailItem.create({
    data: {
      organizationId: auth.organizationId,
      addressId: d.addressId,
      subscriptionId: d.subscriptionId ?? null,
      senderName: d.senderName ?? null,
      senderAddress: d.senderAddress ?? null,
      receivedAt: d.receivedAt ?? new Date(),
      mailType: d.mailType,
      description: d.description ?? null,
      trackingNumber: d.trackingNumber ?? null,
      notifiedAt: new Date(), // logged = notified
    },
    include: {
      address: { select: { id: true, addressLine: true } },
      subscription: {
        select: {
          id: true,
          companyName: true,
          member: { include: { user: { select: { name: true, email: true } } } },
        },
      },
    },
  });

  return apiSuccess(mailItem, 201);
}
