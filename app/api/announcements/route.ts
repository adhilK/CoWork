import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true } });
  return uo?.organizationId ?? null;
}

const schema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  isPinned: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const announcements = await prisma.announcement.findMany({
    where: { organizationId: orgId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  return apiSuccess(announcements);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const announcement = await prisma.announcement.create({
    data: { organizationId: orgId, ...parsed.data },
  });
  return apiSuccess(announcement, 201);
}
