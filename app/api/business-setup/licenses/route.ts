import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiAuth, requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { z } from "zod";

const LICENSE_TYPES = [
  "UAE_MAINLAND_DED", "UAE_FREEZONE", "UAE_OFFSHORE_RAKICC", "UAE_OFFSHORE_JAFZA", "UAE_BRANCH_OFFICE",
  "KSA_MAINLAND_MISA", "KSA_SEZ_KAFD", "KSA_SEZ_JAZAN", "KSA_SEZ_NEOM", "KSA_BRANCH_OFFICE", "KSA_REPRESENTATIVE_OFFICE",
] as const;

// Read access: anyone with the businessSetup capability (incl. PRO_AGENT).
export async function GET(req: NextRequest) {
  const auth = await getApiAuth();
  if (!auth || !can(auth.role, "businessSetup")) return apiError("Forbidden", 403);

  const sp = req.nextUrl.searchParams;
  const where: any = { organizationId: auth.organizationId, deletedAt: null };
  const jurisdiction = sp.get("jurisdiction");
  const licenseType = sp.get("licenseType");
  const emirate = sp.get("emirate");
  const activeOnly = sp.get("active") === "true";
  const search = sp.get("search")?.trim();
  if (jurisdiction) where.jurisdiction = jurisdiction;
  if (licenseType) where.licenseType = licenseType;
  if (emirate) where.emirate = emirate;
  if (activeOnly) where.isActive = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { authority: { contains: search, mode: "insensitive" } },
      { activityCategory: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.licenseCatalog.findMany({
    where,
    orderBy: [{ isPopular: "desc" }, { authority: "asc" }, { name: "asc" }],
  });

  return apiSuccess({ data: items, count: items.length });
}

const createSchema = z.object({
  jurisdiction: z.enum(["UAE", "KSA"]).default("UAE"),
  licenseType: z.enum(LICENSE_TYPES),
  authority: z.string().min(1).max(120),
  emirate: z.string().max(60).optional().nullable(),
  name: z.string().min(1).max(160),
  activityCategory: z.string().max(60).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  baseCost: z.number().min(0).optional().nullable(),
  govFees: z.number().min(0).optional().nullable(),
  visaQuota: z.number().int().min(0).max(999).optional().nullable(),
  officeType: z.string().max(60).optional().nullable(),
  minShareCapital: z.number().min(0).optional().nullable(),
  tenureYears: z.number().int().min(1).max(10).default(1),
  processingDays: z.number().int().min(0).max(365).optional().nullable(),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const item = await prisma.licenseCatalog.create({
    data: {
      organizationId: auth.organizationId,
      jurisdiction: d.jurisdiction,
      licenseType: d.licenseType,
      authority: d.authority,
      emirate: d.emirate ?? null,
      name: d.name,
      activityCategory: d.activityCategory ?? null,
      description: d.description ?? null,
      baseCost: d.baseCost ?? null,
      govFees: d.govFees ?? null,
      visaQuota: d.visaQuota ?? null,
      officeType: d.officeType ?? null,
      minShareCapital: d.minShareCapital ?? null,
      tenureYears: d.tenureYears,
      processingDays: d.processingDays ?? null,
      features: d.features,
      isActive: d.isActive,
      isPopular: d.isPopular,
    },
  });

  return apiSuccess(item, 201);
}
