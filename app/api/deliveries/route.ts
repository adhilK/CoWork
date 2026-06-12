import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { dispatchWhatsAppText } from "@/lib/jobs";
import { z } from "zod";

async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true, role: true } });
  if (!uo || uo.role === "MEMBER") return null;
  return uo.organizationId;
}

const createSchema = z.object({
  memberId: z.string().cuid().optional().nullable(),
  courierName: z.string().max(120).optional().nullable(),
  trackingNumber: z.string().max(120).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  receivedBy: z.string().max(120).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const pending = req.nextUrl.searchParams.get("pending");
  const where: any = { organizationId: orgId, deletedAt: null };
  if (pending === "true") where.collectedAt = null;

  const deliveries = await prisma.delivery.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    take: 200,
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });
  return apiSuccess({ data: deliveries });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  let member = null;
  if (d.memberId) {
    member = await prisma.member.findFirst({
      where: { id: d.memberId, organizationId: orgId, deletedAt: null },
      include: { user: { select: { name: true } } },
    });
    if (!member) return apiError("Member not found", 404);
  }

  const delivery = await prisma.delivery.create({
    data: {
      organizationId: orgId,
      memberId: d.memberId ?? null,
      courierName: d.courierName ?? null,
      trackingNumber: d.trackingNumber ?? null,
      description: d.description ?? null,
      receivedBy: d.receivedBy ?? null,
      notifiedAt: member?.whatsAppNumber ? new Date() : null,
    },
    include: { member: { include: { user: { select: { name: true, email: true } } } } },
  });

  // Notify the member their delivery arrived (queued WhatsApp).
  if (member?.whatsAppNumber) {
    await dispatchWhatsAppText({
      organizationId: orgId,
      to: member.whatsAppNumber,
      memberId: member.id,
      messageType: "MAIL_RECEIVED",
      relatedEntityType: "delivery",
      relatedEntityId: delivery.id,
      body: `Hi ${member.user.name ?? "there"}, a delivery${d.courierName ? ` from ${d.courierName}` : ""} has arrived for you at reception. Please collect it at your convenience.`,
    });
    await prisma.delivery.update({ where: { id: delivery.id }, data: { whatsappNotified: true } });
  }

  return apiSuccess(delivery, 201);
}
