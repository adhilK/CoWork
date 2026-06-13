import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireBusinessSetup } from "@/lib/business-setup/access";
import { z } from "zod";

const stepSchema = z.object({
  step: z.string().min(1).max(160),
  status: z.enum(["pending", "in_progress", "done"]).default("pending"),
  completedAt: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const upsertSchema = z.object({
  referenceNumber: z.string().max(120).optional().nullable(),
  authorityName: z.string().max(120).optional().nullable(),
  currentStep: z.string().max(160).optional().nullable(),
  steps: z.array(stepSchema).optional(),
  submittedAt: z.coerce.date().optional().nullable(),
  approvedAt: z.coerce.date().optional().nullable(),
  licenseNumber: z.string().max(120).optional().nullable(),
  licenseExpiry: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// Default checklist seeded on first creation.
const DEFAULT_STEPS = [
  { step: "Name reservation", status: "pending" },
  { step: "Initial approval", status: "pending" },
  { step: "MOA / documents signing", status: "pending" },
  { step: "License issuance", status: "pending" },
  { step: "Establishment card", status: "pending" },
  { step: "Visa allocation", status: "pending" },
];

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    include: { application: true },
  });
  if (!lead) return apiError("Lead not found", 404);

  const body = await req.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const data: any = {};
  if (d.referenceNumber !== undefined) data.referenceNumber = d.referenceNumber;
  if (d.authorityName !== undefined) data.authorityName = d.authorityName;
  if (d.currentStep !== undefined) data.currentStep = d.currentStep;
  if (d.steps !== undefined) data.steps = d.steps;
  if (d.submittedAt !== undefined) data.submittedAt = d.submittedAt;
  if (d.approvedAt !== undefined) data.approvedAt = d.approvedAt;
  if (d.licenseNumber !== undefined) data.licenseNumber = d.licenseNumber;
  if (d.licenseExpiry !== undefined) data.licenseExpiry = d.licenseExpiry;
  if (d.notes !== undefined) data.notes = d.notes;

  const application = await prisma.businessSetupApplication.upsert({
    where: { leadId: lead.id },
    create: {
      leadId: lead.id,
      organizationId: auth.organizationId,
      jurisdiction: lead.jurisdiction,
      licenseType: lead.licenseType,
      authorityName: d.authorityName ?? lead.freezoneName ?? lead.sezName ?? null,
      currentStep: d.currentStep ?? "Name reservation",
      steps: (d.steps ?? DEFAULT_STEPS) as any,
      referenceNumber: d.referenceNumber ?? null,
      submittedAt: d.submittedAt ?? null,
      approvedAt: d.approvedAt ?? null,
      licenseNumber: d.licenseNumber ?? null,
      licenseExpiry: d.licenseExpiry ?? null,
      notes: d.notes ?? null,
    },
    update: data,
  });

  return apiSuccess(application);
}
