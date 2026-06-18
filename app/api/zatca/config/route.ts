import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { isWafeqConfigured } from "@/lib/zatca/wafeq";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const [org, config] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: auth.organizationId },
      select: {
        jurisdiction: true,
        taxRegistrationNumber: true,
        name: true,
        wafeqAccountId: true,
        zatcaDeviceId: true,
        zatcaCrNumber: true,
        zatcaVatNumber: true,
        zatcaAddress: true,
      },
    }),
    prisma.jurisdictionConfig.findUnique({
      where: { organizationId: auth.organizationId },
      select: { zatcaEnabled: true, arabicInvoices: true },
    }),
  ]);

  return apiSuccess({
    jurisdiction: org?.jurisdiction ?? "UAE",
    vatNumber: org?.taxRegistrationNumber ?? null,
    sellerName: org?.name ?? null,
    zatcaEnabled: config?.zatcaEnabled ?? false,
    arabicInvoices: config?.arabicInvoices ?? false,
    wafeqConfigured: isWafeqConfigured(),
    wafeqAccountId: org?.wafeqAccountId ?? null,
    deviceRegistered: !!org?.zatcaDeviceId,
    crNumber: org?.zatcaCrNumber ?? null,
    zatcaVatNumber: org?.zatcaVatNumber ?? null,
    zatcaAddress: org?.zatcaAddress ?? null,
    zatcaEnv: process.env.ZATCA_ENV ?? "simulation",
  });
}

const updateSchema = z.object({
  zatcaEnabled: z.boolean().optional(),
  arabicInvoices: z.boolean().optional(),
  // Business details (written to Organization model)
  crNumber: z.string().max(50).optional().nullable(),
  zatcaVatNumber: z.string().max(50).optional().nullable(),
  zatcaAddress: z
    .object({
      street: z.string().max(200).optional(),
      buildingNumber: z.string().max(20).optional(),
      district: z.string().max(100).optional(),
      city: z.string().max(100).optional(),
      postalCode: z.string().max(20).optional(),
    })
    .optional()
    .nullable(),
});

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  if (auth.role !== "OWNER") return apiError("Only the owner can change ZATCA settings", 403);
  const orgId = auth.organizationId;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { zatcaEnabled, arabicInvoices, crNumber, zatcaVatNumber, zatcaAddress } = parsed.data;

  const updates: Promise<unknown>[] = [];

  // Update JurisdictionConfig toggles if provided.
  if (zatcaEnabled !== undefined || arabicInvoices !== undefined) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { jurisdiction: true },
    });
    updates.push(
      prisma.jurisdictionConfig.upsert({
        where: { organizationId: orgId },
        update: {
          ...(zatcaEnabled !== undefined ? { zatcaEnabled } : {}),
          ...(arabicInvoices !== undefined ? { arabicInvoices } : {}),
        },
        create: {
          organizationId: orgId,
          jurisdictions: org?.jurisdiction ? [org.jurisdiction] : [],
          primaryJurisdiction: org?.jurisdiction ?? "UAE",
          ...(zatcaEnabled !== undefined ? { zatcaEnabled } : {}),
          ...(arabicInvoices !== undefined ? { arabicInvoices } : {}),
        },
      })
    );
  }

  // Update Organization business detail fields if provided.
  const orgPatch: Record<string, unknown> = {};
  if (crNumber !== undefined) orgPatch.zatcaCrNumber = crNumber;
  if (zatcaVatNumber !== undefined) orgPatch.zatcaVatNumber = zatcaVatNumber;
  if (zatcaAddress !== undefined) orgPatch.zatcaAddress = zatcaAddress;

  if (Object.keys(orgPatch).length > 0) {
    updates.push(
      prisma.organization.update({ where: { id: orgId }, data: orgPatch })
    );
  }

  await Promise.all(updates);
  return apiSuccess({ ok: true });
}
