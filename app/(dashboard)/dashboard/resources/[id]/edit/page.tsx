import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResourceForm } from "@/components/resources/resource-form";

export const metadata: Metadata = { title: "Edit Resource â€” Maktaby" };
export const dynamic = "force-dynamic";

export default async function EditResourcePage({ params }: { params: { id: string } }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const userOrg = { organizationId: ctx.organizationId, organization: ctx.organization };

  const [resource, locations] = await Promise.all([
    prisma.resource.findFirst({
      where: { id: params.id, organizationId: userOrg.organizationId, deletedAt: null },
    }),
    prisma.location.findMany({
      where: { organizationId: userOrg.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!resource) notFound();

  const defaultValues = {
    name: resource.name,
    type: resource.type,
    locationId: resource.locationId,
    description: resource.description ?? undefined,
    capacity: resource.capacity,
    hourlyRate: resource.hourlyRate ? Number(resource.hourlyRate) : undefined,
    halfDayRate: resource.halfDayRate ? Number(resource.halfDayRate) : undefined,
    fullDayRate: resource.fullDayRate ? Number(resource.fullDayRate) : undefined,
    amenities: resource.amenities,
    images: resource.images,
    requiresApproval: resource.requiresApproval,
    advanceBookingDays: resource.advanceBookingDays,
    minBookingMinutes: resource.minBookingMinutes,
    maxBookingHours: resource.maxBookingHours,
    externalBookingEnabled: resource.externalBookingEnabled,
    externalHourlyRate: resource.externalHourlyRate ? Number(resource.externalHourlyRate) : undefined,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/resources" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to resources
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit resource</h1>
        <p className="text-sm text-gray-500 mt-0.5">{resource.name}</p>
      </div>
      <div className="dashboard-card p-6">
        <ResourceForm
          locations={locations}
          currency={userOrg.organization.currency}
          resourceId={resource.id}
          defaultValues={defaultValues}
        />
      </div>
    </div>
  );
}