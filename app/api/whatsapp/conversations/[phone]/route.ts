import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { normalizePhone } from "@/lib/whatsapp";

/** Full message thread for one phone number, oldest → newest. */
export async function GET(_req: NextRequest, { params }: { params: { phone: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const phone = normalizePhone(decodeURIComponent(params.phone));

  const messages = await prisma.whatsAppMessage.findMany({
    where: { organizationId: orgId, phone },
    orderBy: { sentAt: "asc" },
    include: {
      member: { include: { user: { select: { name: true, email: true, avatar: true } } } },
    },
  });

  return apiSuccess({ data: messages });
}

/** Mark all inbound messages in this thread as read. */
export async function POST(_req: NextRequest, { params }: { params: { phone: string } }) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);
  const orgId = auth.organizationId;

  const phone = normalizePhone(decodeURIComponent(params.phone));

  await prisma.whatsAppMessage.updateMany({
    where: { organizationId: orgId, phone, direction: "INBOUND", status: { not: "READ" } },
    data: { status: "READ", readAt: new Date() },
  });

  return apiSuccess({ success: true });
}
