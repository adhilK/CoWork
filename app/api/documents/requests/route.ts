import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { resolveDocumentAccess } from "@/lib/documents";
import { z } from "zod";

const DOCUMENT_TYPES = [
  "PASSPORT", "EMIRATES_ID", "IQAMA", "VISA", "TRADE_LICENSE", "EJARI",
  "ESTABLISHMENT_CARD", "SHARE_CERTIFICATE", "MOA", "AOA", "BANK_STATEMENT",
  "INSURANCE_CERTIFICATE", "POWER_OF_ATTORNEY", "TENANCY_CONTRACT",
  "MEDICAL_FITNESS", "POLICE_CLEARANCE", "DEGREE_CERTIFICATE", "OTHER",
] as const;

/** List document requests. Members see their own; staff see all (optionally by member). */
export async function GET(req: NextRequest) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);

  const sp = req.nextUrl.searchParams;
  const statusFilter = sp.get("status");
  const requestedMemberId = sp.get("memberId");

  const where: any = { organizationId: access.organizationId, deletedAt: null };
  if (!access.isAdmin) where.memberId = access.memberId;
  else if (requestedMemberId) where.memberId = requestedMemberId;
  if (statusFilter) where.status = statusFilter;

  const requests = await prisma.documentRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });

  // Derive OVERDUE on read for any past-due pending request.
  const now = Date.now();
  const data = requests.map((r) => ({
    ...r,
    status:
      r.status === "PENDING" && r.dueDate && new Date(r.dueDate).getTime() < now
        ? "OVERDUE"
        : r.status,
    member: { id: r.member.id, name: r.member.user.name, email: r.member.user.email },
  }));

  return apiSuccess({ data });
}

const createSchema = z.object({
  memberId: z.string().cuid(),
  documentType: z.enum(DOCUMENT_TYPES),
  message: z.string().max(1000).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

/** Staff create a document request addressed to a member. */
export async function POST(req: NextRequest) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);
  if (!access.isAdmin) return apiError("Only staff can request documents", 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const member = await prisma.member.findFirst({
    where: { id: d.memberId, organizationId: access.organizationId, deletedAt: null },
  });
  if (!member) return apiError("Member not found", 404);

  const request = await prisma.documentRequest.create({
    data: {
      organizationId: access.organizationId,
      memberId: d.memberId,
      requestedBy: access.userId,
      documentType: d.documentType,
      message: d.message ?? null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
    },
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });

  return apiSuccess(request, 201);
}
