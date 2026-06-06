"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { Controller } from "react-hook-form";
import type { Organization } from "@prisma/client";

type Props = { organization: Organization };

const TIMEZONES = [
  "Europe/London", "Europe/Paris", "America/New_York",
  "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney",
];

const CURRENCIES = [
  { value: "GBP", label: "£ GBP" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "AED", label: "AED" },
];

export function SettingsView({ organization }: Props) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting, isDirty } } =
    useForm<UpdateOrganizationInput>({
      resolver: zodResolver(updateOrganizationSchema),
      defaultValues: {
        name: organization.name,
        email: organization.email ?? "",
        phone: organization.phone ?? "",
        address: organization.address ?? "",
        website: organization.website ?? "",
        timezone: organization.timezone,
        currency: organization.currency,
      },
    });

  async function onSubmit(data: UpdateOrganizationInput) {
    try {
      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your coworking space settings</p>
      </div>

      <div className="dashboard-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Space details</h2>
          <p className="text-sm text-gray-500 mt-0.5">Basic information about your space</p>
        </div>
        <Separator />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full space-y-1.5">
              <Label>Space name *</Label>
              <Input {...register("name")} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register("phone")} />
            </div>
            <div className="col-span-full space-y-1.5">
              <Label>Address</Label>
              <Input {...register("address")} />
            </div>
            <div className="col-span-full space-y-1.5">
              <Label>Website</Label>
              <Input placeholder="https://..." {...register("website")} />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Controller control={control} name="timezone" render={({ field }) => (
                <Select value={field.value ?? "Europe/London"} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Controller control={control} name="currency" render={({ field }) => (
                <Select value={field.value ?? "GBP"} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting || !isDirty}
              className="text-white" style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </div>

      {/* Plan section */}
      <div className="dashboard-card p-6">
        <h2 className="text-base font-semibold text-gray-900">Subscription</h2>
        <p className="text-sm text-gray-500 mt-1">
          Current plan: <strong>{organization.plan}</strong>
          {organization.trialEndsAt && new Date(organization.trialEndsAt) > new Date() && (
            <span className="ml-2 text-amber-600">
              (trial ends {formatDate(organization.trialEndsAt)})
            </span>
          )}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/dashboard/billing"}>
          Manage billing →
        </Button>
      </div>
    </div>
  );
}
