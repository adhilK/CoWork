import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";
import { sendMemberInvite } from "@/lib/email";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  // Verify caller is admin/owner of this org
  const ctx = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: { organizationId: true, role: true },
  });
  if (!ctx || ctx.role === "MEMBER") return apiError("Forbidden", 403);

  // Load the member
  const member = await prisma.member.findFirst({
    where: { id: params.id, organizationId: ctx.organizationId, deletedAt: null },
    include: {
      user: { select: { email: true, name: true } },
      organization: { select: { name: true } },
    },
  });
  if (!member) return apiError("Member not found", 404);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabaseAdmin = createAdminClient();

  const redirectTo = `${appUrl}/api/auth/confirm?next=/portal`;

  // Try invite link first (for new users). If the user already has a Supabase
  // auth account, fall back to a magic link so they can still log in.
  let linkData = null;
  let { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: member.user.email,
    options: { data: { name: member.user.name }, redirectTo },
  });

  if (error && error.message.includes("already been registered")) {
    // Existing Supabase user — send a one-click magic link instead
    ({ data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: member.user.email,
      options: { redirectTo },
    }));
  }

  linkData = data;

  if (error || !linkData?.properties?.action_link) {
    console.error("[resend-invite] generateLink failed:", error?.message);
    return apiError("Failed to generate invite link. Please try again.", 500);
  }

  await sendMemberInvite({
    to: member.user.email,
    memberName: member.user.name,
    orgName: member.organization.name,
    inviteLink: linkData.properties.action_link,
  });

  return apiSuccess({ message: "Invite resent" });
}
