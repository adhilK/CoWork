import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
import { z } from "zod";

const createAddressSchema = z.object({
  addressLine: z.string().min(1).max(500),
  addressType: z.enum(["MAINLAND", "FREEZONE", "OFFSHORE", "PREMIUM_BUSINESS_DISTRICT"]).default("MAINLAND"),
  jurisdiction: z.enum(["UAE", "KSA"]).default("UAE"),
  freezoneName: z.string().max(100).optional().nullable(),
  ejariNumber: z.string().max(50).optional().nullable(),
  maxClients: z.number().int().min(1).max(9999).default(50),
  monthlyFee: z.number().min(0),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const onlyActive = sp.get("active") === "true";

  const where: any = {
    organizationId: auth.organizationId,
    deletedAt: null,
    ...(onlyActive && { isActive: true }),
  };

  const [addresses, total] = await Promise.all([
    prisma.virtualOfficeAddress.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: {
            subscriptions: { where: { status: "ACTIVE", deletedAt: null } },
          },
        },
      },
    }),
    prisma.virtualOfficeAddress.count({ where }),
  ]);

  return apiSuccess({ data: addresses, meta: buildPaginationMeta(total, page, limit) });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createAddressSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const d = parsed.data;
  const address = await prisma.virtualOfficeAddress.create({
    data: {
      organizationId: auth.organizationId,
      addressLine: d.addressLine,
      addressType: d.addressType,
      jurisdiction: d.jurisdiction,
      freezoneName: d.freezoneName ?? null,
      ejariNumber: d.ejariNumber ?? null,
      maxClients: d.maxClients,
      monthlyFee: d.monthlyFee,
      isActive: d.isActive,
    },
  });

  return apiSuccess(address, 201);
}
