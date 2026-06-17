import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResourceForm } from "@/components/resources/resource-form";

export const metadata: Metadata = { title: "Add Resource — Maktaby" };
export const dynamic = "force-dynamic";

export default async function NewResourcePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const userOrg = { organizationId: ctx.organizationId, organization: ctx.organization };

  const locations = await prisma.location.findMany({
    where: { organizationId: userOrg.organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/resources" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to resources
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add resource</h1>
        <p className="text-sm text-gray-500 mt-0.5">Add a new desk, meeting room, or office to your space</p>
      </div>
      <div className="dashboard-card p-6">
        <ResourceForm locations={locations} currency={userOrg.organization.currency} />
      </div>
    </div>
  );
}
