import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { uploadVisitorPhoto, getVisitorPhotoUrl } from "@/lib/storage";
import { z } from "zod";

export const runtime = "nodejs";

async function getOrgId(userId: string) {
  const uo = await prisma.userOrganization.findFirst({ where: { userId }, select: { organizationId: true, role: true } });
  if (!uo || uo.role === "MEMBER") return null;
  return uo.organizationId;
}

const schema = z.object({ image: z.string().min(1) }); // data URL

// Upload a captured webcam photo for the visitor.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const visitor = await prisma.visitor.findFirst({ where: { id: params.id, organizationId: orgId, deletedAt: null } });
  if (!visitor) return apiError("Visitor not found", 404);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError("Invalid image");

  const result = await uploadVisitorPhoto(orgId, params.id, parsed.data.image);
  if (!result.ok) return apiError(`Photo upload failed: ${result.error}`, 502);

  await prisma.visitor.update({ where: { id: params.id }, data: { photoUrl: result.path } });
  return apiSuccess({ success: true });
}

// Return a short-lived signed URL for the visitor's photo.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);
  const orgId = await getOrgId(user.id);
  if (!orgId) return apiError("No organization", 403);

  const visitor = await prisma.visitor.findFirst({
    where: { id: params.id, organizationId: orgId, deletedAt: null },
    select: { photoUrl: true },
  });
  if (!visitor) return apiError("Visitor not found", 404);
  if (!visitor.photoUrl) return apiError("No photo", 404);

  const url = await getVisitorPhotoUrl(visitor.photoUrl);
  if (!url) return apiError("Could not generate photo link", 502);
  return apiSuccess({ url });
}
