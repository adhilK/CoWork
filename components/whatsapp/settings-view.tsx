"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Copy, Check, ShieldCheck, AlertCircle,
  ExternalLink, RefreshCw, Wifi, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Config = {
  phoneNumberId: string;
  businessAccountId: string;
  verifyToken: string;
  displayNumber: string | null;
  isActive: boolean;
  hasAccessToken: boolean;
};

type Props = {
  isOwner: boolean;
  webhookUrl: string;
  initialConfig: Config | null;
};

function genToken() {
  // 24-char alphanumeric token
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <div className={cn(
      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
      done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500",
    )}>
      {done ? <Check className="w-3.5 h-3.5" /> : n}
    </div>
  );
}

function CopyField({ label, value, id }: { label: string; value: string; id: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-500">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs bg-gray-50 text-gray-600" />
        <Button variant="outline" size="sm" className="h-9 px-3 flex-shrink-0" onClick={copy}>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function WhatsAppSettingsView({ isOwner, webhookUrl, initialConfig }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phoneNumberId: initialConfig?.phoneNumberId ?? "",
    businessAccountId: initialConfig?.businessAccountId ?? "",
    accessToken: "",
    verifyToken: initialConfig?.verifyToken || genToken(),
    displayNumber: initialConfig?.displayNumber ?? "",
    isActive: initialConfig?.isActive ?? false,
  });
  const hasToken = initialConfig?.hasAccessToken ?? false;
  const isConfigured = !!(initialConfig?.phoneNumberId && initialConfig?.businessAccountId && hasToken);

  const regenerateToken = useCallback(() => {
    setForm((f) => ({ ...f, verifyToken: genToken() }));
    toast.info("New verify token generated — re-paste it into Meta");
  }, []);

  async function save() {
    if (!form.phoneNumberId.trim() || !form.businessAccountId.trim() || !form.verifyToken.trim()) {
      toast.error("Phone Number ID, Business Account ID, and Verify Token are required");
      return;
    }
    if (!hasToken && !form.accessToken.trim()) {
      toast.error("Access token is required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        phoneNumberId: form.phoneNumberId,
        businessAccountId: form.businessAccountId,
        verifyToken: form.verifyToken,
        displayNumber: form.displayNumber || null,
        isActive: form.isActive,
      };
      if (form.accessToken.trim()) payload.accessToken = form.accessToken;
      const res = await fetch("/api/whatsapp/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("WhatsApp settings saved");
      setForm((f) => ({ ...f, accessToken: "" }));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/whatsapp" className="p-1.5 rounded-lg hover:bg-black/5">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="page-title">WhatsApp setup</h1>
          <p className="page-subtitle">4 steps · takes about 10 minutes</p>
        </div>
      </div>

      {/* Owner gate */}
      {!isOwner && (
        <div className="dashboard-card p-4 flex items-center gap-3 bg-amber-50/50 border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">Only the workspace owner can change WhatsApp credentials.</p>
        </div>
      )}

      {/* Status pill */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl border",
        initialConfig?.isActive ? "bg-emerald-50 border-emerald-100" : "bg-gray-50 border-gray-100",
      )}>
        {initialConfig?.isActive
          ? <Wifi className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          : <WifiOff className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {initialConfig?.isActive ? "Connected and active" : isConfigured ? "Credentials saved — not yet active" : "Not connected"}
          </p>
          <p className="text-xs text-gray-500">
            {initialConfig?.isActive
              ? "WhatsApp messages are being sent through your Business number."
              : "Complete the steps below to start sending messages."}
          </p>
        </div>
      </div>

      {/* ── Step 1 ── Create a Meta App */}
      <div className="dashboard-card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <StepBadge n={1} done={isConfigured} />
          <div>
            <p className="text-sm font-semibold text-gray-900">Create a Meta app and add WhatsApp</p>
            <p className="text-xs text-gray-500">One-time setup in the Meta Developer Portal</p>
          </div>
        </div>
        <div className="ml-10 space-y-2 text-sm text-gray-600">
          <p>1. Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5">developers.facebook.com <ExternalLink className="w-3 h-3" /></a> and sign in with your Facebook/Meta account.</p>
          <p>2. Click <strong>My Apps → Create App → Business</strong>.</p>
          <p>3. Inside the app, click <strong>Add a product</strong> and choose <strong>WhatsApp</strong>.</p>
          <p>4. Connect your <strong>Meta Business Account</strong> when prompted.</p>
        </div>
      </div>

      {/* ── Step 2 ── Paste credentials */}
      <div className="dashboard-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <StepBadge n={2} done={isConfigured} />
          <div>
            <p className="text-sm font-semibold text-gray-900">Add your API credentials</p>
            <p className="text-xs text-gray-500">Find these in Meta → WhatsApp → API Setup</p>
          </div>
        </div>

        <fieldset disabled={!isOwner} className="ml-10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Phone Number ID <span className="text-red-400">*</span></Label>
              <Input
                placeholder="e.g. 109876543210987"
                value={form.phoneNumberId}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))}
              />
              <p className="text-[11px] text-gray-400">
                In Meta → WhatsApp → API Setup, under <em>From</em>. It's the long number next to your phone number.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Business Account ID <span className="text-red-400">*</span></Label>
              <Input
                placeholder="e.g. 102345678901234"
                value={form.businessAccountId}
                onChange={(e) => setForm((f) => ({ ...f, businessAccountId: e.target.value }))}
              />
              <p className="text-[11px] text-gray-400">
                Same page — shown at the top as <em>WhatsApp Business Account</em>.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Access token {hasToken
                ? <span className="text-gray-400 font-normal text-[11px] ml-1">saved — leave blank to keep it</span>
                : <span className="text-red-400">*</span>}
            </Label>
            <Input
              type="password"
              placeholder={hasToken ? "•••••••••• (already saved)" : "Paste your permanent system-user token"}
              value={form.accessToken}
              onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
            />
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[11px] text-amber-800 space-y-1">
              <p className="font-semibold">Use a permanent System User token, not a temporary one.</p>
              <p>Temporary tokens expire in 24 hours and will break your WhatsApp integration. To get a permanent one:</p>
              <p>Meta Business Settings → <strong>System Users</strong> → Add a system user → Generate token → select your app → grant <em>whatsapp_business_messaging</em> permission.</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Display number <span className="text-gray-400 font-normal text-[11px]">optional</span></Label>
            <Input
              placeholder="+971 50 000 0000"
              value={form.displayNumber}
              onChange={(e) => setForm((f) => ({ ...f, displayNumber: e.target.value }))}
            />
            <p className="text-[11px] text-gray-400">Shown in the dashboard to identify which number is active.</p>
          </div>
        </fieldset>
      </div>

      {/* ── Step 3 ── Webhook */}
      <div className="dashboard-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <StepBadge n={3} />
          <div>
            <p className="text-sm font-semibold text-gray-900">Connect the webhook</p>
            <p className="text-xs text-gray-500">So Meta can send you incoming messages and status updates</p>
          </div>
        </div>

        <div className="ml-10 space-y-4">
          <div className="space-y-3">
            <CopyField label="Callback URL — paste this into Meta" value={webhookUrl} id="url" />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-500">Verify token — paste this into Meta</Label>
                {isOwner && (
                  <button onClick={regenerateToken} className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600">
                    <RefreshCw className="w-3 h-3" /> Regenerate
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  readOnly={!isOwner}
                  value={form.verifyToken}
                  onChange={(e) => setForm((f) => ({ ...f, verifyToken: e.target.value }))}
                  className="font-mono text-xs bg-gray-50"
                />
                <Button variant="outline" size="sm" className="h-9 px-3 flex-shrink-0"
                  onClick={() => { navigator.clipboard.writeText(form.verifyToken); toast.success("Copied!"); }}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-gray-400">
                This is auto-generated. You can use any value — it just has to match on both sides.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 space-y-1.5 text-sm text-blue-800">
            <p className="font-semibold text-blue-900">How to paste these into Meta:</p>
            <ol className="list-decimal ml-4 space-y-1 text-[13px]">
              <li>In your Meta app, go to <strong>WhatsApp → Configuration</strong></li>
              <li>Under <strong>Webhook</strong>, click <strong>Edit</strong></li>
              <li>Paste the <strong>Callback URL</strong> and <strong>Verify token</strong> above</li>
              <li>Click <strong>Verify and save</strong></li>
              <li>Under <strong>Webhook fields</strong>, click <strong>Manage</strong> and subscribe to <strong>messages</strong></li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Step 4 ── Go live */}
      <div className="dashboard-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <StepBadge n={4} done={initialConfig?.isActive} />
          <div>
            <p className="text-sm font-semibold text-gray-900">Save and go live</p>
            <p className="text-xs text-gray-500">Activate once steps 1–3 are done</p>
          </div>
        </div>

        <fieldset disabled={!isOwner} className="ml-10 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Active — enable sending and receiving</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Only check this after you have completed the webhook setup in Meta. Otherwise messages will fail silently.
              </p>
            </div>
          </label>

          {isOwner && (
            <Button
              onClick={save}
              disabled={saving}
              className="text-white w-full sm:w-auto"
              style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Save settings
            </Button>
          )}
        </fieldset>
      </div>

      {/* Help footer */}
      <p className="text-center text-xs text-gray-400 pb-2">
        Need help?{" "}
        <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noreferrer"
          className="text-emerald-600 hover:underline inline-flex items-center gap-0.5">
          Read the Meta Cloud API guide <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </div>
  );
}
