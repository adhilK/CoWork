import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WhatsAppSettingsView } from "@/components/whatsapp/settings-view";
import { getBaseUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "WhatsApp Settings — Maktaby" };
export const dynamic = "force-dynamic";

export default async function WhatsAppSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const config = await prisma.whatsAppConfig.findUnique({
    where: { organizationId: ctx.organizationId },
  });

  return (
    <WhatsAppSettingsView
      isOwner={ctx.role === "OWNER"}
      webhookUrl={`${getBaseUrl()}/api/webhooks/whatsapp`}
      initialConfig={
        config
          ? {
              phoneNumberId: config.phoneNumberId,
              businessAccountId: config.businessAccountId,
              verifyToken: config.verifyToken,
              displayNumber: config.displayNumber,
              isActive: config.isActive,
              hasAccessToken: !!config.accessToken,
            }
          : null
      }
    />
  );
}
