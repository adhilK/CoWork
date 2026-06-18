import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { registerDevice, isWafeqConfigured } from "@/lib/zatca/wafeq";
import { z } from "zod";

const schema = z.object({
  otp: z.string().min(4, "OTP is required"),
  deviceName: z.string().min(1).max(100).default("CoWork Pro"),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  if (auth.role !== "OWNER") return apiError("Only the workspace owner can register a ZATCA device", 403);

  if (!isWafeqConfigured()) {
    return apiError("WAFEQ_API_KEY is not configured", 503);
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: { wafeqAccountId: true, zatcaDeviceId: true },
  });
  if (!org) return apiError("Organization not found", 404);

  if (!org.wafeqAccountId) {
    return apiError("Connect to Wafeq first (Step 2) before registering a device", 422);
  }

  // Idempotent — warn if already registered but allow re-registration.
  try {
    const device = await registerDevice(
      org.wafeqAccountId,
      parsed.data.otp,
      parsed.data.deviceName
    );

    await prisma.organization.update({
      where: { id: auth.organizationId },
      data: { zatcaDeviceId: device.id },
    });

    return apiSuccess({ deviceId: device.id, deviceName: device.common_name, status: device.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to register device";
    return apiError(msg, 502);
  }
}
