import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { resolveDocumentAccess, serializeDocument } from "@/lib/documents";
import { encryptField } from "@/lib/encryption";
import { deleteDocumentObject } from "@/lib/storage";
import { z } from "zod";

async function findDoc(id: string, access: Awaited<ReturnType<typeof resolveDocumentAccess>>) {
  if (!access) return null;
  const where: any = { id, organizationId: access.organizationId, deletedAt: null };
  if (!access.isAdmin) where.memberId = access.memberId;
  return prisma.document.findFirst({
    where,
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);
  const doc = await findDoc(params.id, access);
  if (!doc) return apiError("Document not found", 404);
  return apiSuccess(serializeDocument(doc));
}

// Only staff may change metadata/verification. Members upload new versions instead.
const updateSchema = z.object({
  label: z.string().max(200).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  issueDate: z.string().optional().nullable(),
  issueCountry: z.string().max(100).optional().nullable(),
  documentNumber: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  isVerified: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);
  if (!access.isAdmin) return apiError("Only staff can edit document details", 403);

  const doc = await findDoc(params.id, access);
  if (!doc) return apiError("Document not found", 404);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const data: any = {};
  if (d.label !== undefined) data.label = d.label;
  if (d.expiryDate !== undefined) data.expiryDate = d.expiryDate ? new Date(d.expiryDate) : null;
  if (d.issueDate !== undefined) data.issueDate = d.issueDate ? new Date(d.issueDate) : null;
  if (d.issueCountry !== undefined) data.issueCountry = d.issueCountry;
  if (d.documentNumber !== undefined) data.documentNumber = encryptField(d.documentNumber);
  if (d.notes !== undefined) data.notes = d.notes;
  if (d.isVerified !== undefined) {
    data.isVerified = d.isVerified;
    data.verifiedAt = d.isVerified ? new Date() : null;
    data.verifiedBy = d.isVerified ? access.userId : null;
  }

  const updated = await prisma.document.update({
    where: { id: params.id },
    data,
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });

  return apiSuccess(serializeDocument(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);

  const doc = await findDoc(params.id, access);
  if (!doc) return apiError("Document not found", 404);

  // Soft-delete the row; remove the underlying object to free storage.
  await prisma.document.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  });
  await deleteDocumentObject(doc.fileUrl);

  return apiSuccess({ success: true });
}
