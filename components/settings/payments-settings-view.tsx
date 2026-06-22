"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CreditCard,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Loader2,
  Building2,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type Props = {
  role: string;
  paymentProvider: string;
  tapConfigured: boolean;
  tapMasked: string | null;
  tapEnvConfigured: boolean;
  moyasarConfigured: boolean;
  moyasarMasked: string | null;
  bankTransferDetails: { bankName?: string; iban?: string; accountName?: string } | null;
  webhookUrl: string | null;
};

function StatusBadge({ configured, label }: { configured: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        configured
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-gray-50 text-gray-500 border-gray-200"
      }`}
    >
      {configured ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      {label}
    </span>
  );
}

function SecretInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 font-mono text-sm"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-600 break-all">
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        className="flex-shrink-0 p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors"
        title="Copy"
      >
        {copied ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

export function PaymentsSettingsView({
  role,
  paymentProvider: initialProvider,
  tapConfigured,
  tapMasked,
  tapEnvConfigured,
  moyasarConfigured,
  moyasarMasked,
  bankTransferDetails: initialBank,
  webhookUrl,
}: Props) {
  const isOwner = role === "OWNER";

  const [provider, setProvider] = useState(initialProvider);
  const [tapKey, setTapKey] = useState("");
  const [moyasarKey, setMoyasarKey] = useState("");
  const [bank, setBank] = useState({
    bankName: initialBank?.bankName ?? "",
    iban: initialBank?.iban ?? "",
    accountName: initialBank?.accountName ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { paymentProvider: provider };
      if (tapKey.trim()) body.tapSecretKey = tapKey.trim();
      if (moyasarKey.trim()) body.moyasarApiKey = moyasarKey.trim();
      body.bankTransferDetails = {
        bankName: bank.bankName.trim() || undefined,
        iban: bank.iban.trim() || undefined,
        accountName: bank.accountName.trim() || undefined,
      };

      const res = await fetch("/api/organization/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? "Failed to save");
      }
      toast.success("Payment settings saved");
      setTapKey("");
      setMoyasarKey("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link href="/dashboard/settings" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 mb-3 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          Settings
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#15803D,#22C55E)" }}>
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title mb-0">Payment gateway</h1>
            <p className="page-subtitle mb-0">Configure how members pay for bookings and plans</p>
          </div>
        </div>
      </div>

      {!isOwner && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Only the workspace owner can update payment settings.
        </div>
      )}

      {/* Primary provider */}
      <div className="dashboard-card p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Primary payment gateway</h2>
          <p className="text-sm text-gray-500 mt-0.5">Members will be sent to this gateway when paying invoices.</p>
        </div>
        <Separator />

        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "TAP", label: "Tap Payments", sub: "UAE · KSA · KW · BH", recommended: true },
            { value: "MOYASAR", label: "Moyasar", sub: "KSA · Mada · STC Pay", recommended: false },
          ].map(({ value, label, sub, recommended }) => (
            <button
              key={value}
              type="button"
              disabled={!isOwner}
              onClick={() => setProvider(value)}
              className={`relative flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all disabled:cursor-not-allowed ${
                provider === value
                  ? "border-green-600 bg-green-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              {recommended && (
                <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold bg-green-600 text-white px-1.5 py-0.5 rounded-full">
                  Recommended
                </span>
              )}
              <span className="font-semibold text-gray-900 text-sm">{label}</span>
              <span className="text-xs text-gray-400">{sub}</span>
              {provider === value && (
                <CheckCircle2 className="absolute bottom-2.5 right-2.5 w-4 h-4 text-green-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tap configuration */}
      <div className="dashboard-card p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Tap Payments</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter your Tap secret key from the Tap dashboard.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {tapConfigured && <StatusBadge configured label="Custom key" />}
            {!tapConfigured && tapEnvConfigured && <StatusBadge configured label="Env fallback" />}
            {!tapConfigured && !tapEnvConfigured && <StatusBadge configured={false} label="Not configured" />}
          </div>
        </div>
        <Separator />

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tapKey">
              Secret key
              {tapMasked && (
                <span className="ml-2 font-normal text-xs text-gray-400">Current: {tapMasked}</span>
              )}
            </Label>
            <SecretInput
              id="tapKey"
              value={tapKey}
              onChange={setTapKey}
              placeholder={tapConfigured ? "Enter new key to replace" : "sk_live_••••••••••"}
            />
            <p className="text-xs text-gray-400">
              Found in your Tap dashboard under Developers → API keys. Keys are encrypted before storage.
            </p>
          </div>

          {webhookUrl && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                Webhook URL
                <Info className="w-3.5 h-3.5 text-gray-300" />
              </Label>
              <CopyField value={webhookUrl} />
              <p className="text-xs text-gray-400">
                Add this URL in Tap dashboard → Developers → Webhooks. Tap will call it when payments are completed.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Moyasar configuration */}
      <div className="dashboard-card p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Moyasar <span className="text-xs font-normal text-gray-400 ml-1">KSA only</span></h2>
            <p className="text-sm text-gray-500 mt-0.5">For Saudi Arabia — enables Mada cards and STC Pay.</p>
          </div>
          <StatusBadge configured={moyasarConfigured} label={moyasarConfigured ? "Configured" : "Not configured"} />
        </div>
        <Separator />

        <div className="space-y-1.5">
          <Label htmlFor="moyasarKey">
            API key
            {moyasarMasked && (
              <span className="ml-2 font-normal text-xs text-gray-400">Current: {moyasarMasked}</span>
            )}
          </Label>
          <SecretInput
            id="moyasarKey"
            value={moyasarKey}
            onChange={setMoyasarKey}
            placeholder={moyasarConfigured ? "Enter new key to replace" : "pk_live_••••••••••"}
          />
          <p className="text-xs text-gray-400">Found in your Moyasar dashboard under API keys.</p>
        </div>
      </div>

      {/* Bank transfer */}
      <div className="dashboard-card p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Bank transfer details</h2>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Optional. Shown to members as an alternative payment method on unpaid invoices.
          </p>
        </div>
        <Separator />

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankName">Bank name</Label>
              <Input
                id="bankName"
                value={bank.bankName}
                onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))}
                placeholder="e.g. Emirates NBD"
                disabled={!isOwner}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountName">Account name</Label>
              <Input
                id="accountName"
                value={bank.accountName}
                onChange={(e) => setBank((b) => ({ ...b, accountName: e.target.value }))}
                placeholder="e.g. Maktaby LLC"
                disabled={!isOwner}
              />
            </div>
            <div className="col-span-full space-y-1.5">
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={bank.iban}
                onChange={(e) => setBank((b) => ({ ...b, iban: e.target.value }))}
                placeholder="e.g. AE070331234567890123456"
                className="font-mono"
                disabled={!isOwner}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      {isOwner && (
        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={saving}
            className="text-white px-8"
            style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save payment settings"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
