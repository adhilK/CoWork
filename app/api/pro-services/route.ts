import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireProServices } from "@/lib/pro-services/access";
import { ALL_SERVICE_TYPES, SERVICE_DEFAULT_GOVERNING_BODY, SERVICE_STEP_TEMPLATES } from "@/lib/pro-services/meta";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const auth = await requireProServices();
  if (!auth) return apiError("Forbidden", 403);

  const sp = req.nextUrl.searchParams;
  const where: any = { organizationId: auth.organizationId, deletedAt: null };
  const stage = sp.get("stage");
  const memberId = sp.get("memberId");
  const mine = sp.get("mine");
  if (stage) where.stage = stage;
  if (memberId) where.memberId = memberId;
  if (mine === "true") where.assignedTo = auth.userId;

  const requests = await prisma.proServiceRequest.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });

  return apiSuccess({
    data: requests.map((r) => ({ ...r, fee: r.fee == null ? null : Number(r.fee) })),
  });
}

const createSchema = z.object({
  memberId: z.string().cuid(),
  serviceType: z.enum(ALL_SERVICE_TYPES as [string, ...string[]]),
  jurisdiction: z.enum(["UAE", "KSA"]).default("UAE"),
  serviceDescription: z.string().max(1000).optional().nullable(),
  urgency: z.enum(["STANDARD", "EXPRESS", "URGENT"]).default("STANDARD"),
  governingBody: z.string().max(80).optional().nullable(),
  referenceNumber: z.string().max(120).optional().nullable(),
  fee: z.number().min(0).optional().nullable(),
  slaDays: z.number().int().min(0).max(180).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  clientNotes: z.string().max(2000).optional().nullable(),
  internalNotes: z.string().max(2000).optional().nullable(),
});

const URGENCY_SLA: Record<string, number> = { STANDARD: 7, EXPRESS: 3, URGENT: 1 };

export async function POST(req: NextRequest) {
  const auth = await requireProServices();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const member = await prisma.member.findFirst({
    where: { id: d.memberId, organizationId: auth.organizationId, deletedAt: null },
  });
  if (!member) return apiError("Member not found", 404);

  if (d.assignedTo) {
    const uo = await prisma.userOrganization.findFirst({ where: { userId: d.assignedTo, organizationId: auth.organizationId } });
    if (!uo) return apiError("Assignee not in organization", 400);
  }

  const slaDays = d.slaDays ?? URGENCY_SLA[d.urgency] ?? 7;
  const dueDate = d.dueDate ?? new Date(Date.now() + slaDays * 24 * 60 * 60 * 1000);

  // Auto-fill governing body and steps from the service type template if not explicitly provided.
  const defaultGoverningBody = SERVICE_DEFAULT_GOVERNING_BODY[d.serviceType] ?? null;
  const seedSteps = SERVICE_STEP_TEMPLATES[d.serviceType] ?? [];

  const request = await prisma.proServiceRequest.create({
    data: {
      organizationId: auth.organizationId,
      memberId: d.memberId,
      assignedTo: d.assignedTo ?? auth.userId,
      jurisdiction: d.jurisdiction,
      serviceType: d.serviceType as any,
      serviceDescription: d.serviceDescription ?? null,
      urgency: d.urgency,
      governingBody: d.governingBody || defaultGoverningBody || null,
      referenceNumber: d.referenceNumber ?? null,
      requestedBy: auth.userId,
      fee: d.fee ?? null,
      currency: d.jurisdiction === "KSA" ? "SAR" : "AED",
      slaDays,
      dueDate,
      clientNotes: d.clientNotes ?? null,
      internalNotes: d.internalNotes ?? null,
      steps: seedSteps as any,
      activities: {
        create: { userId: auth.userId, stage: "SUBMITTED", note: "Request created", isClientVisible: true },
      },
    },
  });

  return apiSuccess(request, 201);
}
