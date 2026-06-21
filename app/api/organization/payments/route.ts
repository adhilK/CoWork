import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { encryptField, decryptField } from "@/lib/encryption";

function maskKey(key: string | null | undefined): string | null {
  if (!key) return null;
  const plain = decryptField(key);
  if (!plain || plain.length < 8) return "••••••••";
  return `••••••••${plain.slice(-4)}`;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: { role: true, organizationId: true },
  });
  if (!userOrg || !["OWNER", "ADMIN"].includes(userOrg.role)) {
    return apiError("Forbidden", 403);
  }

  const org = await prisma.organization.findUnique({
    where: { id: userOrg.organizationId },
    select: {
      paymentProvider: true,
      tapSecretKey: true,
      moyasarApiKey: true,
      bankTransferDetails: true,
    },
  });
  if (!org) return apiError("Organization not found", 404);

  return apiSuccess({
    paymentProvider: org.paymentProvider,
    tapSecretKeyMasked: maskKey(org.tapSecretKey),
    tapConfigured: !!org.tapSecretKey,
    tapEnvConfigured: !!process.env.TAP_SECRET_KEY,
    moyasarApiKeyMasked: maskKey(org.moyasarApiKey),
    moyasarConfigured: !!org.moyasarApiKey,
    bankTransferDetails: org.bankTransferDetails as {
      bankName?: string;
      iban?: string;
      accountName?: string;
    } | null,
  });
}

const schema = z.object({
  paymentProvider: z.enum(["TAP", "MOYASAR"]).optional(),
  tapSecretKey: z.string().max(200).optional(),
  moyasarApiKey: z.string().max(200).optional(),
  bankTransferDetails: z
    .object({
      bankName: z.string().max(100).optional(),
      iban: z.string().max(50).optional(),
      accountName: z.string().max(100).optional(),
    })
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: { role: true, organizationId: true },
  });
  if (!userOrg || userOrg.role !== "OWNER") {
    return apiError("Only owners can update payment settings", 403);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const { paymentProvider, tapSecretKey, moyasarApiKey, bankTransferDetails } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (paymentProvider !== undefined) updateData.paymentProvider = paymentProvider;
  if (tapSecretKey !== undefined && tapSecretKey.trim() !== "") {
    updateData.tapSecretKey = encryptField(tapSecretKey.trim());
  }
  if (moyasarApiKey !== undefined && moyasarApiKey.trim() !== "") {
    updateData.moyasarApiKey = encryptField(moyasarApiKey.trim());
  }
  if (bankTransferDetails !== undefined) {
    updateData.bankTransferDetails = bankTransferDetails;
  }

  if (Object.keys(updateData).length === 0) {
    return apiSuccess({ message: "No changes" });
  }

  await prisma.organization.update({
    where: { id: userOrg.organizationId },
    data: updateData,
  });

  return apiSuccess({ message: "Payment settings saved" });
}
