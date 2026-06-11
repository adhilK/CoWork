import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
import { resolveDocumentAccess, serializeDocument } from "@/lib/documents";
import { encryptField } from "@/lib/encryption";
import {
  buildDocumentPath, uploadDocument, deleteDocumentObject,
  MAX_FILE_BYTES, ALLOWED_MIME_TYPES,
} from "@/lib/storage";
import { z } from "zod";

// Multipart upload needs the Node runtime (Buffer, no edge size limits on body).
export const runtime = "nodejs";

const DOCUMENT_TYPES = [
  "PASSPORT", "EMIRATES_ID", "IQAMA", "VISA", "TRADE_LICENSE", "EJARI",
  "ESTABLISHMENT_CARD", "SHARE_CERTIFICATE", "MOA", "AOA", "BANK_STATEMENT",
  "INSURANCE_CERTIFICATE", "POWER_OF_ATTORNEY", "TENANCY_CONTRACT",
  "MEDICAL_FITNESS", "POLICE_CLEARANCE", "DEGREE_CERTIFICATE", "OTHER",
] as const;

export async function GET(req: NextRequest) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);

  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const typeFilter = sp.get("type");
  const expiring = sp.get("expiring"); // "true" → next 30 days or already expired
  const requestedMemberId = sp.get("memberId");

  const where: any = { organizationId: access.organizationId, deletedAt: null };

  // Members are locked to their own documents; admins may filter by member.
  if (!access.isAdmin) {
    where.memberId = access.memberId;
  } else if (requestedMemberId) {
    where.memberId = requestedMemberId;
  }

  if (typeFilter && (DOCUMENT_TYPES as readonly string[]).includes(typeFilter)) {
    where.documentType = typeFilter;
  }
  if (expiring === "true") {
    where.expiryDate = { not: null, lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: [{ expiryDate: "asc" }, { uploadedAt: "desc" }],
      skip,
      take: limit,
      include: { member: { include: { user: { select: { name: true, email: true } } } } },
    }),
    prisma.document.count({ where }),
  ]);

  return apiSuccess({
    data: documents.map(serializeDocument),
    meta: buildPaginationMeta(total, page, limit),
  });
}

const metadataSchema = z.object({
  memberId: z.string().cuid().optional(),
  documentType: z.enum(DOCUMENT_TYPES),
  label: z.string().max(200).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  issueCountry: z.string().max(100).optional().nullable(),
  documentNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  // When set, this upload supersedes an existing document (new version).
  replaceDocumentId: z.string().cuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("Expected multipart form data");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return apiError("No file provided");
  if (file.size === 0) return apiError("File is empty");
  if (file.size > MAX_FILE_BYTES) return apiError("File exceeds 20 MB limit");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return apiError("Unsupported file type. Allowed: PDF, JPG, PNG, WEBP, HEIC, DOC, DOCX");
  }

  // Parse metadata JSON field
  const rawMeta = form.get("metadata");
  let metaObj: unknown = {};
  if (typeof rawMeta === "string" && rawMeta) {
    try { metaObj = JSON.parse(rawMeta); } catch { return apiError("Invalid metadata JSON"); }
  }
  const parsed = metadataSchema.safeParse(metaObj);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid metadata");
  const d = parsed.data;

  // Resolve target member. Members can only upload their own.
  let memberId: string;
  if (access.isAdmin) {
    if (!d.memberId) return apiError("memberId is required");
    const member = await prisma.member.findFirst({
      where: { id: d.memberId, organizationId: access.organizationId, deletedAt: null },
    });
    if (!member) return apiError("Member not found", 404);
    memberId = member.id;
  } else {
    memberId = access.memberId!;
    if (d.memberId && d.memberId !== memberId) return apiError("Forbidden", 403);
  }

  // If replacing, validate the target belongs to the same member/org.
  let replacing = null as null | { id: string; version: number };
  if (d.replaceDocumentId) {
    const prev = await prisma.document.findFirst({
      where: { id: d.replaceDocumentId, organizationId: access.organizationId, memberId, deletedAt: null },
      select: { id: true, version: true },
    });
    if (!prev) return apiError("Document to replace not found", 404);
    replacing = prev;
  }

  const documentId = `cuid_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  const path = buildDocumentPath(access.organizationId, memberId, documentId, file.name);

  const arrayBuffer = await file.arrayBuffer();
  const upload = await uploadDocument(path, arrayBuffer, file.type || "application/octet-stream");
  if (!upload.ok) return apiError(`Storage upload failed: ${upload.error}`, 502);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          organizationId: access.organizationId,
          memberId,
          documentType: d.documentType,
          label: d.label ?? null,
          fileUrl: path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          expiryDate: d.expiryDate ? new Date(d.expiryDate) : null,
          issueDate: d.issueDate ? new Date(d.issueDate) : null,
          issueCountry: d.issueCountry ?? null,
          documentNumber: encryptField(d.documentNumber ?? null),
          notes: d.notes ?? null,
          uploadedBy: access.userId,
          version: replacing ? replacing.version + 1 : 1,
          previousVersionId: replacing ? replacing.id : null,
        },
        include: { member: { include: { user: { select: { name: true, email: true } } } } },
      });

      // Retire the old version (kept for history via previousVersionId chain).
      if (replacing) {
        await tx.document.update({
          where: { id: replacing.id },
          data: { deletedAt: new Date() },
        });
      }

      // Auto-fulfill any matching pending document requests for this member+type.
      await tx.documentRequest.updateMany({
        where: {
          organizationId: access.organizationId,
          memberId,
          documentType: d.documentType,
          status: "PENDING",
          deletedAt: null,
        },
        data: { status: "FULFILLED", fulfilledAt: new Date(), fulfilledDocId: doc.id },
      });

      return doc;
    });

    return apiSuccess(serializeDocument(created), 201);
  } catch (err) {
    // Roll back the uploaded object if the DB write failed.
    await deleteDocumentObject(path);
    return apiError("Failed to save document", 500);
  }
}
