/**
 * POST /api/consent
 * Record or update a user's consent decision.
 * Rows are append-only (PDPL compliance) — the latest row per
 * (userId, consentType) represents the current consent state.
 */
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  consentType: z.enum(["DATA_PROCESSING", "MARKETING", "COOKIES"]),
  consentGiven: z.boolean(),
  version: z.string().max(20).optional().default("1.0"),
  organizationId: z.string().optional(), // optional — included after org creation
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const log = await prisma.consentLog.create({
    data: {
      userId: user.id,
      organizationId: parsed.data.organizationId ?? null,
      consentType: parsed.data.consentType,
      consentGiven: parsed.data.consentGiven,
      ipAddress,
      userAgent,
      version: parsed.data.version,
    },
    select: { id: true, consentType: true, consentGiven: true, createdAt: true },
  });

  return apiSuccess(log, 201);
}

/** GET /api/consent — return current consent state per type for the caller. */
export async function GET(_req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  // Most recent row per consentType — represents current consent state.
  const logs = await prisma.consentLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { consentType: true, consentGiven: true, version: true, createdAt: true },
  });

  // Deduplicate: keep only the latest per type.
  const current: Record<string, typeof logs[0]> = {};
  for (const row of logs) {
    if (!current[row.consentType]) current[row.consentType] = row;
  }

  return apiSuccess(Object.values(current));
}
