import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { resolveDocumentAccess } from "@/lib/documents";
import { getSignedUrl } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Returns a fresh 15-minute signed URL for the document. Access is scoped:
 * members can only download their own files; staff can download any in the org.
 * The raw storage path is never returned to the client.
 *
 * ?disposition=inline  → open in browser (default)
 * ?disposition=attachment → force download with the original filename
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await resolveDocumentAccess();
  if (!access) return apiError("Unauthorized", 401);

  const where: any = { id: params.id, organizationId: access.organizationId, deletedAt: null };
  if (!access.isAdmin) where.memberId = access.memberId;

  const doc = await prisma.document.findFirst({ where });
  if (!doc) return apiError("Document not found", 404);

  const disposition = req.nextUrl.searchParams.get("disposition");
  const signedUrl = await getSignedUrl(
    doc.fileUrl,
    disposition === "attachment" ? doc.fileName : undefined
  );
  if (!signedUrl) return apiError("Could not generate download link", 502);

  return apiSuccess({ url: signedUrl, fileName: doc.fileName, mimeType: doc.mimeType, expiresIn: 900 });
}
