"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials, formatDate } from "@/lib/utils";

type ProfileData = {
  name: string;
  email: string;
  avatar: string | null;
  phone: string;
  bio: string;
  company: string;
  jobTitle: string;
  memberSince: string;
  planName: string | null;
  credits: number;
  status: string;
};

type Props = {
  profile: ProfileData;
};

export function ProfileView({ profile }: Props) {
  const [form, setForm] = useState({
    name: profile.name,
    phone: profile.phone,
    bio: profile.bio,
    company: profile.company,
    jobTitle: profile.jobTitle,
  });
  const [saving, setSaving] = useState(false);

  function handleChange(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          company: form.company.trim() || null,
          jobTitle: form.jobTitle.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to save profile");
        return;
      }
      toast.success("Profile updated");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Update your personal information and preferences.
        </p>
      </div>

      {/* Profile header card */}
      <div className="dashboard-card p-5">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14 flex-shrink-0">
            <AvatarImage src={profile.avatar ?? undefined} />
            <AvatarFallback className="text-lg font-bold bg-emerald-100 text-emerald-700">
              {initials(profile.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-base leading-tight">{profile.name || "—"}</p>
            <p className="text-sm text-gray-400 mt-0.5">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {profile.planName && (
                <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">
                  {profile.planName}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className={`text-xs ${
                  profile.status === "ACTIVE"
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-gray-50 text-gray-500 border-gray-100"
                }`}
              >
                {profile.status.charAt(0) + profile.status.slice(1).toLowerCase()}
              </Badge>
              <span className="text-xs text-gray-400">
                {profile.credits} credit{profile.credits !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="text-right hidden sm:block flex-shrink-0">
            <p className="text-xs text-gray-400">Member since</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">
              {formatDate(profile.memberSince)}
            </p>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="dashboard-card p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-5">Personal information</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name" className="text-sm font-medium text-gray-700">
                Full name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="profile-name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Your name"
                className="text-sm border-gray-200"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-sm font-medium text-gray-700">
                Email address
              </Label>
              <Input
                id="profile-email"
                value={profile.email}
                disabled
                className="text-sm border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-gray-400">Contact support to change your email</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-phone" className="text-sm font-medium text-gray-700">
                Phone
              </Label>
              <Input
                id="profile-phone"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+44 7700 000000"
                className="text-sm border-gray-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-company" className="text-sm font-medium text-gray-700">
                Company
              </Label>
              <Input
                id="profile-company"
                value={form.company}
                onChange={(e) => handleChange("company", e.target.value)}
                placeholder="Your company name"
                className="text-sm border-gray-200"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-jobtitle" className="text-sm font-medium text-gray-700">
              Job title
            </Label>
            <Input
              id="profile-jobtitle"
              value={form.jobTitle}
              onChange={(e) => handleChange("jobTitle", e.target.value)}
              placeholder="e.g. Product Designer"
              className="text-sm border-gray-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-bio" className="text-sm font-medium text-gray-700">
              Bio
            </Label>
            <textarea
              id="profile-bio"
              value={form.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              placeholder="A short bio about yourself..."
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none transition-colors placeholder:text-gray-300"
            />
            <p className="text-[11px] text-gray-300 text-right">
              {form.bio.length}/500
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Save changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
