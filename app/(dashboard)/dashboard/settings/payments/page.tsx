import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/encryption";
import { PaymentsSettingsView } from "@/components/settings/payments-settings-view";

export const metadata: Metadata = { title: "Payment gateway — Settings" };
export const dynamic = "force-dynamic";

export default async function PaymentsSettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!can(ctx.role, "settings")) redirect("/dashboard");

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      paymentProvider: true,
      tapSecretKey: true,
      moyasarApiKey: true,
      bankTransferDetails: true,
    },
  });
  if (!org) redirect("/onboarding");

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

  return (
    <PaymentsSettingsView
      role={ctx.role}
      paymentProvider={org.paymentProvider}
      tapConfigured={!!org.tapSecretKey}
      tapMasked={
        org.tapSecretKey
          ? `••••••••${(decryptField(org.tapSecretKey) ?? "").slice(-4)}`
          : null
      }
      tapEnvConfigured={!!process.env.TAP_SECRET_KEY}
      moyasarConfigured={!!org.moyasarApiKey}
      moyasarMasked={
        org.moyasarApiKey
          ? `••••••••${(decryptField(org.moyasarApiKey) ?? "").slice(-4)}`
          : null
      }
      bankTransferDetails={
        (org.bankTransferDetails as {
          bankName?: string;
          iban?: string;
          accountName?: string;
        } | null) ?? null
      }
      webhookUrl={appUrl ? `${appUrl}/api/webhooks/tap` : null}
    />
  );
}
