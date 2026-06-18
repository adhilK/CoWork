/**
 * DELETE /api/members/[id]/erase
 *
 * PDPL right-to-erasure — soft-anonymizes all PII for the given member.
 *
 * What is erased:
 *   - User.name → "Deleted User"
 *   - User.email → anonymized placeholder (preserves uniqueness)
 *   - Member: phone, whatsAppNumber, nationality, passportNumber,
 *             emiratesId, iqamaNumber, visaExpiry, bio, notes, company, jobTitle
 *   - All Document records soft-deleted; files removed from Supabase Storage.
 *
 * What is RETAINED (VAT audit trail — 5-year KSA/UAE legal requirement):
 *   - Invoice records (anonymized member name on PDF at render time)
 *   - Booking records
 *   - Member.id / Member.userId / Member.organizationId (FK integrity)
 *
 * Only OWNER role may execute. An erasure log is written for compliance audit.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { deleteDocumentObject } from "@/lib/storage";

const ERASED_NAME = "Deleted User";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  if (auth.role !== "OWNER") return apiError("Only the workspace owner can erase a member", 403);

  const orgId = auth.organizationId;
  const memberId = params.id;

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: orgId, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true } },
      documents: { where: { deletedAt: null }, select: { id: true, fileUrl: true } },
    },
  });
  if (!member) return apiError("Member not found", 404);
  if (member.erasedAt) return apiError("Member PII has already been erased", 409);

  // Prevent self-erasure (admin cannot erase their own account this way)
  if (member.userId === auth.userId) {
    return apiError("You cannot erase your own account via this endpoint", 400);
  }

  const userId = member.user.id;
  const now = new Date();

  // ── 1. Delete document files from Supabase Storage (best-effort) ─────────
  const filePaths = member.documents.map((d) => d.fileUrl).filter(Boolean);
  await Promise.allSettled(filePaths.map((path) => deleteDocumentObject(path)));

  // ── 2. Soft-delete all document records ──────────────────────────────────
  if (member.documents.length > 0) {
    await prisma.document.updateMany({
      where: { memberId, organizationId: orgId, deletedAt: null },
      data: { deletedAt: now },
    });
  }

  // ── 3. Anonymize User PII ─────────────────────────────────────────────────
  // We cannot null the email (unique constraint) — use a deterministic
  // placeholder that contains no identifying information.
  const anonEmail = `erased-${userId.slice(0, 8)}@erased.deleted`;
  await prisma.user.update({
    where: { id: userId },
    data: { name: ERASED_NAME, email: anonEmail },
  });

  // ── 4. Anonymize Member PII ───────────────────────────────────────────────
  const fieldsAnonymized = [
    "user.name",
    "user.email",
    "phone",
    "whatsAppNumber",
    "nationality",
    "passportNumber",
    "emiratesId",
    "iqamaNumber",
    "visaExpiry",
    "bio",
    "notes",
    "company",
    "jobTitle",
  ];

  await prisma.member.update({
    where: { id: memberId },
    data: {
      phone: null,
      whatsAppNumber: null,
      nationality: null,
      passportNumber: null,
      emiratesId: null,
      iqamaNumber: null,
      visaExpiry: null,
      bio: null,
      notes: null,
      company: null,
      jobTitle: null,
      erasedAt: now,
    },
  });

  // ── 5. Write erasure audit log ────────────────────────────────────────────
  await prisma.dataErasureLog.create({
    data: {
      organizationId: orgId,
      memberId,
      userId,
      executedBy: auth.userId,
      documentsDeleted: member.documents.length,
      fieldsAnonymized,
    },
  });

  return apiSuccess({
    erased: true,
    memberId,
    documentsDeleted: member.documents.length,
    filesDeletedFromStorage: filePaths.length,
    erasedAt: now.toISOString(),
  });
}
