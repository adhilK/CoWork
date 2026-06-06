import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ResourceBrowser } from "@/components/portal/resource-browser";

export const metadata: Metadata = { title: "Book a Space — CoWork Pro" };
export const dynamic = "force-dynamic";

export default async function BookPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const member = await prisma.member.findFirst({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, organization: { select: { currency: true } } },
  });
  if (!member) redirect("/login");

  return <ResourceBrowser currency={member.organization.currency} />;
}
