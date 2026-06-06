import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateOrganizationSchema } from "@/lib/validations";
import { apiError, apiSuccess } from "@/lib/utils";

export async function GET(_req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    include: { organization: true },
  });
  if (!userOrg) return apiError("No organization", 404);
  return apiSuccess(userOrg.organization);
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } },
    select: { organizationId: true, role: true },
  });
  if (!userOrg) return apiError("Permission denied", 403);

  const body = await req.json();
  const parsed = updateOrganizationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");

  const updated = await prisma.organization.update({
    where: { id: userOrg.organizationId },
    data: parsed.data,
  });
  return apiSuccess(updated);
}
