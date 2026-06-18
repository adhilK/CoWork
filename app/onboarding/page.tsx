import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Set up your space — Maktaby" };
export const dynamic = "force-dynamic";

/**
 * Onboarding wizard entry point.
 *
 * Reached after registration (no-confirmation flow) OR after clicking the
 * email-confirmation link (org not yet created). The wizard's completion
 * endpoint handles both: it creates the org if missing, then provisions the
 * first location, resources, plans, and payments.
 *
 * Bypass: a returning operator whose org already has at least one location
 * has finished setup — send them straight to the dashboard.
 */
export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const link = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          jurisdiction: true,
          phone: true,
          whatsappNumber: true,
          businessType: true,
          _count: { select: { locations: { where: { deletedAt: null } } } },
        },
      },
    },
  });

  // Returning operator with a configured location → setup is already done.
  if (link?.organization && link.organization._count.locations > 0) {
    // Members never see the operator wizard.
    if (link.role === "MEMBER") redirect("/portal");
    redirect("/dashboard");
  }

  const org = link?.organization ?? null;
  const prefillName =
    org?.name && org.name !== "My Space"
      ? org.name
      : ((user.user_metadata?.name as string | undefined)?.split(" ")[0]
          ? `${(user.user_metadata?.name as string).split(" ")[0]}'s Space`
          : "");

  return (
    <OnboardingWizard
      initial={{
        spaceName: org?.name ?? prefillName,
        jurisdiction: (org?.jurisdiction as "UAE" | "KSA") ?? "UAE",
        businessType: org?.businessType ?? "",
        phone: org?.phone ?? "",
        whatsappNumber: org?.whatsappNumber ?? "",
      }}
    />
  );
}
