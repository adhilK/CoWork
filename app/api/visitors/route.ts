import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
import { encryptField } from "@/lib/encryption";
import { dispatchWhatsAppText } from "@/lib/jobs";
import { z } from "zod";

// Admin-only endpoint: members must never reach visitor data.
async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true, role: true } });
  if (!uo || uo.role === "MEMBER") return null;
  return uo.organizationId;
}

const createVisitorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  hostMemberId: z.string().optional(),
  purpose: z.string().optional(),
  expectedArrival: z.string().optional(),
  // GCC fields
  nationality: z.string().max(100).optional(),
  idType: z.enum(["Passport", "Emirates ID", "Iqama"]).optional(),
  idNumber: z.string().max(50).optional(),
  vehiclePlate: z.string().max(20).optional(),
  // Override the blacklist warning to proceed anyway
  overrideBlacklist: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const date = sp.get("date");
  const blacklisted = sp.get("blacklisted");

  const where: any = { organizationId: orgId, deletedAt: null };
  if (blacklisted === "true") where.isBlacklisted = true;
  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  const [visitors, total] = await Promise.all([
    prisma.visitor.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.visitor.count({ where }),
  ]);

  return apiSuccess({ data: visitors, meta: buildPaginationMeta(total, page, limit) });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const body = await req.json();
  const parsed = createVisitorSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  // ── Blacklist screening ──────────────────────────────────────────────────
  // Match prior blacklisted visitors by name (case-insensitive) or phone.
  if (!d.overrideBlacklist) {
    const match = await prisma.visitor.findFirst({
      where: {
        organizationId: orgId,
        isBlacklisted: true,
        deletedAt: null,
        OR: [
          { name: { equals: d.name, mode: "insensitive" } },
          ...(d.phone ? [{ phone: d.phone }] : []),
        ],
      },
      select: { id: true, name: true, blacklistReason: true },
    });
    if (match) {
      return apiError(
        `"${match.name}" is on the blacklist${match.blacklistReason ? ` (${match.blacklistReason})` : ""}. Override to proceed.`,
        409
      );
    }
  }

  const visitor = await prisma.visitor.create({
    data: {
      organizationId: orgId,
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      company: d.company || null,
      hostMemberId: d.hostMemberId || null,
      purpose: d.purpose || null,
      expectedArrival: d.expectedArrival ? new Date(d.expectedArrival) : null,
      nationality: d.nationality || null,
      idType: d.idType || null,
      idNumber: encryptField(d.idNumber || null),
      vehiclePlate: d.vehiclePlate || null,
      checkedInAt: new Date(), // log visitor = auto check-in
    },
  });

  // ── WhatsApp host alert (queued) ─────────────────────────────────────────
  if (d.hostMemberId) {
    const host = await prisma.member.findFirst({
      where: { id: d.hostMemberId, organizationId: orgId, deletedAt: null },
      include: { user: { select: { name: true } }, organization: { select: { name: true } } },
    });
    if (host?.whatsAppNumber) {
      await dispatchWhatsAppText({
        organizationId: orgId,
        to: host.whatsAppNumber,
        memberId: host.id,
        messageType: "VISITOR_ARRIVAL",
        relatedEntityType: "visitor",
        relatedEntityId: visitor.id,
        body: `Hi ${host.user.name ?? "there"}, your visitor ${d.name}${d.company ? ` from ${d.company}` : ""} has arrived at reception.`,
      });
      await prisma.visitor.update({ where: { id: visitor.id }, data: { whatsappNotified: true } });
    }
  }

  // Decrypt nothing back; return the created record (idNumber stays encrypted).
  return apiSuccess(visitor, 201);
}
