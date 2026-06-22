/**
 * GET /api/business-setup/leads/[id]/documents
 * Returns all documents attached to this Business Setup lead (via businessSetupLeadId).
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { requireBusinessSetup } from "@/lib/business-setup/access";
import { getSignedUrl } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireBusinessSetup();
  if (!auth) return apiError("Forbidden", 403);

  const lead = await prisma.businessSetupLead.findFirst({
    where: { id: params.id, organizationId: auth.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!lead) return apiError("Lead not found", 404);

  const documents = await prisma.document.findMany({
    where: { businessSetupLeadId: lead.id, organizationId: auth.organizationId, deletedAt: null },
    orderBy: { uploadedAt: "desc" },
  });

  const result = await Promise.all(
    documents.map(async (d) => ({
      id: d.id,
      fileName: d.fileName,
      mimeType: d.mimeType,
      fileSize: d.fileSize,
      documentType: d.documentType,
      label: d.label,
      uploadedAt: d.uploadedAt.toISOString(),
      downloadUrl: await getSignedUrl(d.fileUrl),
    })),
  );

  return apiSuccess({ documents: result });
}
