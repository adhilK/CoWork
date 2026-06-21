/**
 * GET /api/pro-services/[id]/documents
 * Returns all documents attached to a PRO service request, with signed download URLs.
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { getSignedUrl } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const request = await prisma.proServiceRequest.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!request) return apiError("PRO service request not found", 404);

  const documents = await prisma.document.findMany({
    where: { proServiceRequestId: params.id, organizationId: auth.organizationId, deletedAt: null },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, fileName: true, mimeType: true, fileSize: true, documentType: true, label: true, fileUrl: true, uploadedAt: true },
  });

  const withUrls = await Promise.all(
    documents.map(async (doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      documentType: doc.documentType,
      label: doc.label,
      uploadedAt: doc.uploadedAt.toISOString(),
      downloadUrl: await getSignedUrl(doc.fileUrl, doc.fileName),
    }))
  );

  return apiSuccess({ documents: withUrls });
}
