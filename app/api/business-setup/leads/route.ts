import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireBusinessSetup } from "@/lib/business-setup/access";
import { z } from "zod";

const LICENSE_TYPES = [
  "UAE_MAINLAND_DED", "UAE_FREEZONE", "UAE_OFFSHORE_RAKICC", "UAE_OFFSHORE_JAFZA", "UAE_BRANCH_OFFICE",
  "KSA_MAINLAND_MISA", "KSA_SEZ_KAFD", "KSA_SEZ_JAZAN", "KSA_SEZ_NEOM", "KSA_BRANCH_OFFICE", "KSA_REPRESENTATIVE_OFFICE",
] as const;

export async function GET(req: NextRequest) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const sp = req.nextUrl.searchParams;
  const where: any = { organizationId: auth.organizationId, deletedAt: null };
  const stage = sp.get("stage");
  const assignedTo = sp.get("assignedTo");
  const mine = sp.get("mine");
  if (stage) where.stage = stage;
  if (assignedTo) where.assignedTo = assignedTo;
  if (mine === "true") where.assignedTo = auth.userId;

  const leads = await prisma.businessSetupLead.findMany({
    where,
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    include: { _count: { select: { activities: true } }, proposal: { select: { status: true } } },
  });

  return apiSuccess({
    data: leads.map((l) => ({
      ...l,
      estimatedFee: l.estimatedFee == null ? null : Number(l.estimatedFee),
      quotedFee: l.quotedFee == null ? null : Number(l.quotedFee),
    })),
  });
}

const createSchema = z.object({
  clientName: z.string().min(1).max(160),
  clientPhone: z.string().min(3).max(30),
  clientEmail: z.string().email().optional().or(z.literal("")),
  clientWhatsapp: z.string().max(30).optional().nullable(),
  clientNationality: z.string().max(80).optional().nullable(),
  companyName: z.string().max(200).optional().nullable(),
  jurisdiction: z.enum(["UAE", "KSA"]).default("UAE"),
  licenseType: z.enum(LICENSE_TYPES),
  licenseCatalogId: z.string().cuid().optional().nullable(),
  freezoneName: z.string().max(120).optional().nullable(),
  sezName: z.string().max(120).optional().nullable(),
  businessActivity: z.array(z.string()).default([]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  source: z.string().max(60).optional().nullable(),
  estimatedFee: z.number().min(0).optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  // Validate the selected catalog product / assignee belong to the org.
  if (d.licenseCatalogId) {
    const lc = await prisma.licenseCatalog.findFirst({
      where: { id: d.licenseCatalogId, organizationId: auth.organizationId, deletedAt: null },
    });
    if (!lc) return apiError("License product not found", 404);
  }
  if (d.assignedTo) {
    const uo = await prisma.userOrganization.findFirst({
      where: { userId: d.assignedTo, organizationId: auth.organizationId },
    });
    if (!uo) return apiError("Assignee not in organization", 400);
  }

  const lead = await prisma.businessSetupLead.create({
    data: {
      organizationId: auth.organizationId,
      clientName: d.clientName,
      clientPhone: d.clientPhone,
      clientEmail: d.clientEmail || null,
      clientWhatsapp: d.clientWhatsapp || d.clientPhone,
      clientNationality: d.clientNationality ?? null,
      companyName: d.companyName ?? null,
      jurisdiction: d.jurisdiction,
      licenseType: d.licenseType,
      licenseCatalogId: d.licenseCatalogId ?? null,
      freezoneName: d.freezoneName ?? null,
      sezName: d.sezName ?? null,
      businessActivity: d.businessActivity,
      priority: d.priority,
      source: d.source ?? null,
      estimatedFee: d.estimatedFee ?? null,
      currency: d.jurisdiction === "KSA" ? "SAR" : "AED",
      assignedTo: d.assignedTo ?? auth.userId,
      expectedCloseDate: d.expectedCloseDate ?? null,
      notes: d.notes ?? null,
      activities: {
        create: { userId: auth.userId, activityType: "NOTE", note: "Lead created" },
      },
    },
  });

  return apiSuccess(lead, 201);
}
