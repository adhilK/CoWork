"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { Controller } from "react-hook-form";
import type { Organization } from "@prisma/client";

type Props = { organization: Organization; role: string };

const TIMEZONES = [
  "Asia/Dubai", "Asia/Riyadh", "Asia/Bahrain", "Asia/Qatar", "Asia/Kuwait",
  "Europe/London", "Asia/Singapore",
];

const CURRENCIES = [
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SAR", label: "SAR — Saudi Riyal" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
];

export function SettingsView({ organization, role }: Props) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
        taxRegistrationNumber: organization.taxRegistrationNumber ?? "",
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

  async function handleDeleteAccount() {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Failed to delete account");
      }
      window.location.href = "/register?message=account-deleted";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeleting(false);
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
                <Select value={field.value ?? "Asia/Dubai"} onValueChange={field.onChange}>
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
                <Select value={field.value ?? "AED"} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="col-span-full space-y-1.5">
              <Label>
                Tax registration number
                <span className="ml-2 text-xs font-normal text-gray-400">UAE TRN / KSA VAT number — printed on invoices</span>
              </Label>
              <Input placeholder="e.g. 100123456700003" {...register("taxRegistrationNumber")} />
              {errors.taxRegistrationNumber && <p className="text-xs text-danger">{errors.taxRegistrationNumber.message}</p>}
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

      {/* Team */}
      <div className="dashboard-card p-6">
        <h2 className="text-base font-semibold text-gray-900">Team</h2>
        <p className="text-sm text-gray-500 mt-1">
          Invite staff and manage their roles — admins, managers, receptionists, and PRO agents.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/dashboard/settings/team"}>
          Manage team →
        </Button>
      </div>

      {/* ZATCA e-invoicing (KSA) */}
      <div className="dashboard-card p-6">
        <h2 className="text-base font-semibold text-gray-900">ZATCA e-invoicing</h2>
        <p className="text-sm text-gray-500 mt-1">
          KSA tax-invoice compliance — Phase-1 QR codes and reporting for Saudi Arabia.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/dashboard/settings/zatca"}>
          Configure ZATCA →
        </Button>
      </div>

      {/* Danger Zone — OWNER only */}
      {role === "OWNER" && (
        <div className="dashboard-card p-6 border border-red-200">
          <h2 className="text-base font-semibold text-red-700">Danger Zone</h2>
          <p className="text-sm text-gray-500 mt-1">
            Permanently delete your organization and all associated data. This cannot be undone.
          </p>
          <Button
            variant="outline"
            className="mt-4 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete account and all data
          </Button>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={(e) => { if (e.target === e.currentTarget && !isDeleting) { setShowDeleteModal(false); setConfirmName(""); } }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                  Delete account and all data
                </h3>
                <p className="text-sm text-gray-500 mt-1.5">
                  This will permanently delete your organization, all members, bookings, invoices,
                  documents, and your account.{" "}
                  <strong className="text-gray-700">This cannot be undone.</strong>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-700">
                Type <strong>{organization.name}</strong> to confirm
              </Label>
              <Input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={organization.name}
                className="h-11"
                disabled={isDeleting}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowDeleteModal(false); setConfirmName(""); }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                disabled={confirmName !== organization.name || isDeleting}
                onClick={handleDeleteAccount}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete everything"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
