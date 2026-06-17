import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplatesView } from "@/components/whatsapp/templates-view";

export const metadata: Metadata = { title: "WhatsApp Templates — Maktaby" };
export const dynamic = "force-dynamic";

export default async function WhatsAppTemplatesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const templates = await prisma.whatsAppTemplate.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return <TemplatesView templates={templates as any} />;
}
