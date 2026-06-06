import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ProfileView } from "@/components/portal/profile-view";

export const metadata: Metadata = { title: "Profile — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: {
      user: true,
      membershipPlan: { select: { name: true } },
    },
  });
  if (!member) redirect("/login");

  return (
    <ProfileView
      profile={{
        name: member.user.name ?? "",
        email: member.user.email,
        avatar: member.user.avatar,
        phone: member.phone ?? "",
        bio: member.bio ?? "",
        company: member.company ?? "",
        jobTitle: member.jobTitle ?? "",
        memberSince: member.startDate.toISOString(),
        planName: member.membershipPlan?.name ?? null,
        credits: member.credits,
        status: member.status,
      }}
    />
  );
}
