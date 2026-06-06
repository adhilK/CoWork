import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true } });
  return uo?.organizationId ?? null;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const sp = req.nextUrl.searchParams;
  const memberId = sp.get("memberId");

  // Bookings with a charge that haven't been added to any invoice yet
  const bookings = await prisma.booking.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      invoiceId: null,
      amountCharged: { gt: 0 },
      status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
      ...(memberId && { memberId }),
    },
    include: {
      resource: { select: { id: true, name: true, type: true } },
      member: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { startTime: "desc" },
  });

  // Group totals by member for the summary
  const byMember: Record<string, { memberId: string; memberName: string; total: number; count: number }> = {};
  for (const b of bookings) {
    const mid = b.memberId ?? "__walk_in__";
    const name = b.member?.user?.name ?? b.member?.user?.email ?? "Walk-in";
    if (!byMember[mid]) byMember[mid] = { memberId: mid, memberName: name, total: 0, count: 0 };
    byMember[mid]!.total += Number(b.amountCharged);
    byMember[mid]!.count += 1;
  }

  return apiSuccess({
    bookings,
    summary: Object.values(byMember),
    totalUnbilled: bookings.reduce((s, b) => s + Number(b.amountCharged), 0),
  });
}
