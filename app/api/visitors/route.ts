import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess, buildPaginationMeta, getPaginationParams } from "@/lib/utils";
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
});

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);
  const date = sp.get("date"); // ISO date string for filtering by day

  const where: any = { organizationId: orgId };
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  const [visitors, total] = await Promise.all([
    prisma.visitor.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
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

  const { name, email, phone, company, hostMemberId, purpose, expectedArrival } = parsed.data;

  const visitor = await prisma.visitor.create({
    data: {
      organizationId: orgId,
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      hostMemberId: hostMemberId || null,
      purpose: purpose || null,
      expectedArrival: expectedArrival ? new Date(expectedArrival) : null,
      checkedInAt: new Date(), // log visitor = auto check-in
    },
  });
  return apiSuccess(visitor, 201);
}
