"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Copy, Check, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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

export function WhatsAppSettingsView({ isOwner, webhookUrl, initialConfig }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({
    phoneNumberId: initialConfig?.phoneNumberId ?? "",
    businessAccountId: initialConfig?.businessAccountId ?? "",
    accessToken: "",
    verifyToken: initialConfig?.verifyToken ?? "",
    displayNumber: initialConfig?.displayNumber ?? "",
    isActive: initialConfig?.isActive ?? false,
  });
  const hasToken = initialConfig?.hasAccessToken ?? false;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

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
      <div className="flex items-center gap-3">
        <Link href="/dashboard/whatsapp" className="p-1.5 rounded-lg hover:bg-black/5">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="page-title">WhatsApp settings</h1>
          <p className="page-subtitle">Connect your WhatsApp Business API (Meta Cloud API)</p>
        </div>
      </div>

      {!isOwner && (
        <div className="dashboard-card p-4 flex items-center gap-3 bg-amber-50/50 border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">Only the workspace owner can change WhatsApp credentials. You can view the configuration below.</p>
        </div>
      )}

      {/* Status */}
      <div className="dashboard-card p-5 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${initialConfig?.isActive ? "bg-green-50" : "bg-gray-100"}`}>
          <ShieldCheck className={`w-5 h-5 ${initialConfig?.isActive ? "text-green-600" : "text-gray-400"}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {initialConfig?.isActive ? "Connected & active" : initialConfig ? "Configured — inactive" : "Not connected"}
          </p>
          <p className="text-xs text-gray-400">
            {initialConfig?.isActive
              ? "Messages will be sent through your WhatsApp Business number."
              : "Add and activate credentials to start sending."}
          </p>
        </div>
      </div>

      {/* Webhook config (read-only, for Meta dashboard) */}
      <div className="dashboard-card p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Webhook</h2>
          <p className="text-sm text-gray-500 mt-0.5">Paste these into Meta → WhatsApp → Configuration → Webhook</p>
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Callback URL</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs bg-gray-50" />
              <Button variant="outline" size="sm" className="h-10 px-3 flex-shrink-0" onClick={() => copy(webhookUrl, "url")}>
                {copied === "url" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Verify token</Label>
            <div className="flex gap-2">
              <Input readOnly value={form.verifyToken || "— set one below —"} className="font-mono text-xs bg-gray-50" />
              <Button variant="outline" size="sm" className="h-10 px-3 flex-shrink-0"
                disabled={!form.verifyToken} onClick={() => copy(form.verifyToken, "vt")}>
                {copied === "vt" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">Subscribe to the <strong>messages</strong> webhook field in Meta to receive replies and delivery statuses.</p>
        </div>
      </div>

      {/* Credentials */}
      <div className="dashboard-card p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">API credentials</h2>
          <p className="text-sm text-gray-500 mt-0.5">From Meta → WhatsApp → API Setup. The access token is encrypted at rest.</p>
        </div>
        <Separator />
        <fieldset disabled={!isOwner} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone Number ID *</Label>
              <Input placeholder="e.g. 109876543210987" value={form.phoneNumberId}
                onChange={(e) => setForm((f) => ({ ...f, phoneNumberId: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Business Account ID *</Label>
              <Input placeholder="e.g. 102345678901234" value={form.businessAccountId}
                onChange={(e) => setForm((f) => ({ ...f, businessAccountId: e.target.value }))} />
            </div>
            <div className="col-span-full space-y-1.5">
              <Label>Access token {hasToken ? <span className="text-gray-400 font-normal text-[11px]">leave blank to keep current</span> : "*"}</Label>
              <Input type="password" placeholder={hasToken ? "•••••••••• (saved)" : "Permanent system-user access token"}
                value={form.accessToken}
                onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Verify token *</Label>
              <Input placeholder="Any secret string you choose" value={form.verifyToken}
                onChange={(e) => setForm((f) => ({ ...f, verifyToken: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Display number <span className="text-gray-400 font-normal text-[11px]">optional</span></Label>
              <Input placeholder="+971 50 000 0000" value={form.displayNumber}
                onChange={(e) => setForm((f) => ({ ...f, displayNumber: e.target.value }))} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="waActive" checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600" />
            <Label htmlFor="waActive" className="cursor-pointer">Active — enable sending and receiving</Label>
          </div>

          {isOwner && (
            <div className="flex justify-end pt-2">
              <Button onClick={save} disabled={saving} className="text-white"
                style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save settings
              </Button>
            </div>
          )}
        </fieldset>
      </div>
    </div>
  );
}
