/**
 * Shared access control + serialization for the Document Vault.
 *
 * Access rules:
 *  - OWNER / ADMIN / MANAGER  → full access to every document in their org.
 *  - MEMBER                   → access only to their OWN documents and requests.
 */

import { prisma } from "@/lib/prisma";
import { getApiAuth } from "@/lib/auth";
import { decryptField } from "@/lib/encryption";

export type DocumentAccess = {
  userId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  isAdmin: boolean;
  /** The caller's own member id, when they are a MEMBER (null for staff). */
  memberId: string | null;
};

/** Resolve the caller's document-vault access context, or null if unauthorized. */
export async function resolveDocumentAccess(): Promise<DocumentAccess | null> {
  const auth = await getApiAuth();
  if (!auth) return null;

  const isAdmin = auth.role !== "MEMBER";
  let memberId: string | null = null;

  if (!isAdmin) {
    const member = await prisma.member.findFirst({
      where: { userId: auth.userId, organizationId: auth.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!member) return null;
    memberId = member.id;
  }

  return {
    userId: auth.userId,
    organizationId: auth.organizationId,
    role: auth.role,
    isAdmin,
    memberId,
  };
}

/**
 * Serialize a Document for the client. Never includes the raw storage path
 * (fileUrl); the documentNumber is decrypted for display.
 */
export function serializeDocument(doc: any) {
  return {
    id: doc.id,
    memberId: doc.memberId,
    documentType: doc.documentType,
    label: doc.label,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    expiryDate: doc.expiryDate,
    issueDate: doc.issueDate,
    issueCountry: doc.issueCountry,
    documentNumber: decryptField(doc.documentNumber),
    isVerified: doc.isVerified,
    verifiedAt: doc.verifiedAt,
    verifiedBy: doc.verifiedBy,
    notes: doc.notes,
    version: doc.version,
    previousVersionId: doc.previousVersionId,
    uploadedAt: doc.uploadedAt,
    member: doc.member
      ? {
          id: doc.member.id,
          name: doc.member.user?.name ?? null,
          email: doc.member.user?.email ?? null,
        }
      : undefined,
  };
}

/** Compute an expiry bucket for filtering/badges. */
export function expiryStatus(expiryDate: Date | string | null): "expired" | "soon" | "valid" | "none" {
  if (!expiryDate) return "none";
  const d = new Date(expiryDate).getTime();
  const now = Date.now();
  if (d < now) return "expired";
  if (d < now + 30 * 24 * 60 * 60 * 1000) return "soon";
  return "valid";
}
