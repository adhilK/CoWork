import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireBusinessSetup } from "@/lib/business-setup/access";
import { getBsStepTemplate } from "@/lib/business-setup/step-templates";
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

  // Stage auto-advance helpers — only move forward, never touch LOST.
  const FORWARD_STAGES = ["NEW_ENQUIRY","QUALIFIED","PROPOSAL_SENT","DOCUMENTS_COLLECTION","SUBMITTED_TO_AUTHORITY","AWAITING_APPROVAL","APPROVED","COMPLETED"];
  const stageIdx = (s: string) => FORWARD_STAGES.indexOf(s);
  const canAdvanceTo = (current: string, target: string) => current !== "LOST" && stageIdx(current) >= 0 && stageIdx(current) < stageIdx(target);

  // Detect meaningful transitions for auto-advance.
  const isNewApplication = !lead.application;
  const settingRefNumber = d.referenceNumber !== undefined && !!d.referenceNumber && !lead.application?.referenceNumber;
  const settingLicenseNumber = d.licenseNumber !== undefined && !!d.licenseNumber && !lead.application?.licenseNumber;

  const application = await prisma.$transaction(async (tx) => {
    const app = await tx.businessSetupApplication.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        organizationId: auth.organizationId,
        jurisdiction: lead.jurisdiction,
        licenseType: lead.licenseType,
        authorityName: d.authorityName ?? lead.freezoneName ?? lead.sezName ?? null,
        currentStep: d.currentStep ?? "Name reservation",
        steps: (d.steps ?? getBsStepTemplate(lead.licenseType)) as any,
        referenceNumber: d.referenceNumber ?? null,
        submittedAt: d.submittedAt ?? null,
        approvedAt: d.approvedAt ?? null,
        licenseNumber: d.licenseNumber ?? null,
        licenseExpiry: d.licenseExpiry ?? null,
        notes: d.notes ?? null,
      },
      update: data,
    });

    // Auto-advance: application started → Documents Collection.
    if (isNewApplication && canAdvanceTo(lead.stage, "DOCUMENTS_COLLECTION")) {
      await tx.businessSetupLead.update({ where: { id: lead.id }, data: { stage: "DOCUMENTS_COLLECTION" } });
      await tx.leadActivity.create({
        data: { leadId: lead.id, userId: auth.userId, activityType: "STAGE_CHANGE", note: "Stage → Documents Collection (application started)" },
      });
    }

    // Auto-advance: reference number recorded → Submitted to Authority.
    if (settingRefNumber && canAdvanceTo(lead.stage, "SUBMITTED_TO_AUTHORITY")) {
      await tx.businessSetupLead.update({ where: { id: lead.id }, data: { stage: "SUBMITTED_TO_AUTHORITY" } });
      await tx.leadActivity.create({
        data: { leadId: lead.id, userId: auth.userId, activityType: "STAGE_CHANGE", note: "Stage → Submitted to Authority (reference number recorded)" },
      });
    }

    // Auto-advance: license number issued → Approved.
    if (settingLicenseNumber && canAdvanceTo(lead.stage, "APPROVED")) {
      await tx.businessSetupLead.update({ where: { id: lead.id }, data: { stage: "APPROVED" } });
      await tx.leadActivity.create({
        data: { leadId: lead.id, userId: auth.userId, activityType: "STAGE_CHANGE", note: "Stage → Approved (license issued)" },
      });
    }

    return app;
  });

  return apiSuccess(application);
}
