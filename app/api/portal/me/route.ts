import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

async function getMember(userId: string) {
  return prisma.member.findFirst({
    where: { userId, deletedAt: null },
    include: {
      user: true,
      membershipPlan: { select: { id: true, name: true, price: true, billingCycle: true } },
      organization: { select: { id: true, name: true, currency: true } },
    },
  });
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const member = await getMember(user.id);
  if (!member) return apiError("Member not found", 404);

  return apiSuccess({
    id: member.id,
    status: member.status,
    credits: member.credits,
    startDate: member.startDate,
    company: member.company,
    jobTitle: member.jobTitle,
    bio: member.bio,
    phone: member.phone,
    user: {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatar,
    },
    membershipPlan: member.membershipPlan,
    organization: member.organization,
  });
}

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  company: z.string().max(100).nullable().optional(),
  jobTitle: z.string().max(100).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  const member = await getMember(user.id);
  if (!member) return apiError("Member not found", 404);

  const body = await req.json().catch(() => ({}));
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { name, phone, bio, company, jobTitle } = parsed.data;

  // Update User and Member in parallel
  const [updatedUser, updatedMember] = await Promise.all([
    name !== undefined
      ? prisma.user.update({
          where: { id: user.id },
          data: { name },
        })
      : prisma.user.findUnique({ where: { id: user.id } }),
    prisma.member.update({
      where: { id: member.id },
      data: {
        ...(phone !== undefined && { phone: phone ?? null }),
        ...(bio !== undefined && { bio: bio ?? null }),
        ...(company !== undefined && { company: company ?? null }),
        ...(jobTitle !== undefined && { jobTitle: jobTitle ?? null }),
      },
    }),
  ]);

  return apiSuccess({
    id: updatedMember.id,
    phone: updatedMember.phone,
    bio: updatedMember.bio,
    company: updatedMember.company,
    jobTitle: updatedMember.jobTitle,
    user: {
      id: updatedUser!.id,
      name: updatedUser!.name,
      email: updatedUser!.email,
      avatar: updatedUser!.avatar,
    },
  });
}
