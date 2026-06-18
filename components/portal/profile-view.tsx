"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, Calendar, CheckCircle2, Bell, Mail, MessageCircle, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initials, formatDate } from "@/lib/utils";

type ProfileData = {
  name: string;
  email: string;
  avatar: string | null;
  phone: string;
  bio: string;
  company: string;
  jobTitle: string;
  whatsAppNumber: string;
  language: string;
  notifyByEmail: boolean;
  notifyByWhatsApp: boolean;
  memberSince: string;
  planName: string | null;
  credits: number;
  status: string;
  googleCalendarConnected: boolean;
};

type Props = {
  profile: ProfileData;
};

/** Minimal accessible toggle — no Switch primitive exists in the UI kit. */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-emerald-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function ProfileView({ profile }: Props) {
  const [form, setForm] = useState({
    name: profile.name,
    phone: profile.phone,
    bio: profile.bio,
    company: profile.company,
    jobTitle: profile.jobTitle,
  });
  const [prefs, setPrefs] = useState({
    whatsAppNumber: profile.whatsAppNumber,
    language: profile.language,
    notifyByEmail: profile.notifyByEmail,
    notifyByWhatsApp: profile.notifyByWhatsApp,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(profile.googleCalendarConnected);
  const [disconnecting, setDisconnecting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle callback redirects from Google OAuth
  useEffect(() => {
    const cal = searchParams.get("calendar");
    if (cal === "connected") {
      setCalendarConnected(true);
      toast.success("Google Calendar connected! Your bookings will now appear there automatically.");
      router.replace("/portal/profile");
    } else if (cal === "denied") {
      toast.error("Google Calendar access was denied.");
      router.replace("/portal/profile");
    } else if (cal === "error") {
      toast.error("Something went wrong connecting Google Calendar. Try again.");
      router.replace("/portal/profile");
    }
  }, [searchParams, router]);

  async function handleDisconnectCalendar() {
    setDisconnecting(true);
    try {
      await fetch("/api/auth/google-calendar/disconnect", { method: "POST" });
      setCalendarConnected(false);
      toast.success("Google Calendar disconnected.");
    } catch {
      toast.error("Failed to disconnect. Try again.");
    } finally {
      setDisconnecting(false);
    }
  }

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

  async function handleSavePrefs() {
    setSavingPrefs(true);
    try {
      const res = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsAppNumber: prefs.whatsAppNumber.trim() || null,
          language: prefs.language,
          notifyByEmail: prefs.notifyByEmail,
          notifyByWhatsApp: prefs.notifyByWhatsApp,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to save preferences");
        return;
      }
      toast.success("Preferences saved");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Update your personal information and preferences.</p>
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

      {/* Google Calendar integration */}
      <div className="dashboard-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <h2 className="section-title">Google Calendar</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {calendarConnected
                  ? "Your bookings automatically appear in Google Calendar."
                  : "Connect to sync your bookings to Google Calendar."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {calendarConnected ? (
              <>
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                  disabled={disconnecting}
                  onClick={handleDisconnectCalendar}
                >
                  {disconnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Disconnect"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs text-white"
                style={{ background: "linear-gradient(135deg, #1a73e8, #4285f4)" }}
                onClick={() => { window.location.href = "/api/auth/google-calendar/connect"; }}
              >
                <Calendar className="w-3.5 h-3.5 mr-1.5" /> Connect
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="dashboard-card p-5">
        <h2 className="section-title mb-5">Personal information</h2>

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
              className="text-white text-sm"
              style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
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

      {/* Notification preferences + language */}
      <div className="dashboard-card p-5">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4.5 h-4.5 text-violet-500" />
          </div>
          <div>
            <h2 className="section-title">Notifications &amp; language</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Choose how we reach you and your preferred language.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* WhatsApp number */}
          <div className="space-y-1.5">
            <Label htmlFor="pref-whatsapp" className="text-sm font-medium text-gray-700">
              WhatsApp number
            </Label>
            <Input
              id="pref-whatsapp"
              value={prefs.whatsAppNumber}
              onChange={(e) => setPrefs((p) => ({ ...p, whatsAppNumber: e.target.value }))}
              placeholder="+971 50 000 0000"
              className="text-sm border-gray-200"
            />
            <p className="text-[11px] text-gray-400">Used for booking reminders and updates over WhatsApp.</p>
          </div>

          {/* Channel toggles */}
          <div className="rounded-xl border border-gray-100 divide-y divide-gray-50">
            <div className="flex items-center justify-between gap-3 p-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">Email notifications</p>
                  <p className="text-[11px] text-gray-400">Booking confirmations, invoices, and reminders</p>
                </div>
              </div>
              <Toggle
                checked={prefs.notifyByEmail}
                onChange={(v) => setPrefs((p) => ({ ...p, notifyByEmail: v }))}
                disabled={savingPrefs}
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">WhatsApp notifications</p>
                  <p className="text-[11px] text-gray-400">Instant updates to your WhatsApp number</p>
                </div>
              </div>
              <Toggle
                checked={prefs.notifyByWhatsApp}
                onChange={(v) => setPrefs((p) => ({ ...p, notifyByWhatsApp: v }))}
                disabled={savingPrefs}
              />
            </div>
          </div>

          {/* Preferred language */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-gray-400" /> Preferred language
            </Label>
            <Select
              value={prefs.language}
              onValueChange={(v) => setPrefs((p) => ({ ...p, language: v ?? "en" }))}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية (Arabic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              onClick={handleSavePrefs}
              disabled={savingPrefs}
              className="text-white text-sm"
              style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
            >
              {savingPrefs ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Save preferences
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
