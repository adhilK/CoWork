import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { encryptField } from "@/lib/encryption";
import { z } from "zod";

const upsertConfigSchema = z.object({
  phoneNumberId: z.string().min(1).max(100),
  businessAccountId: z.string().min(1).max(100),
  // accessToken optional on update — only re-encrypt when a new value is sent.
  accessToken: z.string().max(1000).optional(),
  verifyToken: z.string().min(1).max(200),
  displayNumber: z.string().max(30).optional().nullable(),
  isActive: z.boolean().default(false),
});

/** Returns config WITHOUT the decrypted token — only whether it is set. */
export async function GET(_req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const config = await prisma.whatsAppConfig.findUnique({
    where: { organizationId: auth.organizationId },
  });

  if (!config) return apiSuccess({ data: null });

  return apiSuccess({
    data: {
      phoneNumberId: config.phoneNumberId,
      businessAccountId: config.businessAccountId,
      verifyToken: config.verifyToken,
      displayNumber: config.displayNumber,
      isActive: config.isActive,
      hasAccessToken: !!config.accessToken,
    },
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  // Only OWNER may change billing/integration credentials.
  if (auth.role !== "OWNER") return apiError("Only the owner can change WhatsApp credentials", 403);
  const orgId = auth.organizationId;

  const body = await req.json();
  const parsed = upsertConfigSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  const existing = await prisma.whatsAppConfig.findUnique({ where: { organizationId: orgId } });

  // Require an access token on first creation
  if (!existing && !d.accessToken) {
    return apiError("Access token is required");
  }

  const data: any = {
    phoneNumberId: d.phoneNumberId,
    businessAccountId: d.businessAccountId,
    verifyToken: d.verifyToken,
    displayNumber: d.displayNumber ?? null,
    isActive: d.isActive,
  };
  // Only update the token when a new (non-empty) value is provided.
  if (d.accessToken) {
    data.accessToken = encryptField(d.accessToken);
  }

  const config = existing
    ? await prisma.whatsAppConfig.update({ where: { organizationId: orgId }, data })
    : await prisma.whatsAppConfig.create({ data: { organizationId: orgId, ...data } });

  // Mirror the enabled flag onto JurisdictionConfig.whatsappEnabled for consistency.
  await prisma.jurisdictionConfig.updateMany({
    where: { organizationId: orgId },
    data: { whatsappEnabled: d.isActive },
  });

  return apiSuccess({
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
    verifyToken: config.verifyToken,
    displayNumber: config.displayNumber,
    isActive: config.isActive,
    hasAccessToken: !!config.accessToken,
  });
}
