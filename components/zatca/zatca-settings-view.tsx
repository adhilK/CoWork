"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ShieldCheck, AlertCircle, Loader2, QrCode, FileCheck2, Info,
  CheckCircle2, Building2, Plug, Cpu, FlaskConical, Rocket, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type ZatcaAddress = {
  street?: string;
  buildingNumber?: string;
  district?: string;
  city?: string;
  postalCode?: string;
};

type RecentInvoice = {
  id: string;
  invoiceNumber: string | null;
  memberName: string;
  totalAmount: number;
  currency: string;
  zatcaStatus: string | null;
  createdAt: string;
};

type Props = {
  isOwner: boolean;
  jurisdiction: string;
  sellerName: string | null;
  // Step 1 — Business Details
  crNumber: string | null;
  zatcaVatNumber: string | null;
  zatcaAddress: ZatcaAddress | null;
  // Step 2 — Wafeq Connection
  wafeqConfigured: boolean;  // WAFEQ_API_KEY env var is set
  wafeqAccountId: string | null;
  // Step 3 — Device Registration
  deviceRegistered: boolean;
  // Step 5 — Go Live
  zatcaEnabled: boolean;
  arabicInvoices: boolean;
  zatcaEnv: string;
  // Status data
  counts: Record<string, number>;
  recent: RecentInvoice[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  PENDING:  { bg: "bg-amber-50",  text: "text-amber-700" },
  REPORTED: { bg: "bg-blue-50",   text: "text-blue-700" },
  CLEARED:  { bg: "bg-green-50",  text: "text-green-700" },
  REJECTED: { bg: "bg-red-50",    text: "text-red-600" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function StepBadge({ n, done, active }: { n: number; done: boolean; active: boolean }) {
  if (done) return <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
  return (
    <span
      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
        active ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"
      }`}
    >
      {n}
    </span>
  );
}

function StepCard({
  n, title, done, active, locked, icon: Icon, children, onToggle,
}: {
  n: number;
  title: string;
  done: boolean;
  active: boolean;
  locked: boolean;
  icon: React.ElementType;
  children: React.ReactNode;
  onToggle?: () => void;
}) {
  const [open, setOpen] = useState(active);
  const toggle = () => {
    if (!locked) { setOpen((v) => !v); onToggle?.(); }
  };

  return (
    <div
      className={`dashboard-card transition-all ${
        locked ? "opacity-50 pointer-events-none select-none" : ""
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <StepBadge n={n} done={done} active={active} />
        <Icon className={`w-4 h-4 flex-shrink-0 ${done ? "text-emerald-500" : active ? "text-gray-700" : "text-gray-400"}`} />
        <span className={`flex-1 text-sm font-semibold ${done ? "text-emerald-700" : active ? "text-gray-900" : "text-gray-400"}`}>
          {title}
        </span>
        {done && !open && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Done</span>}
        {!locked && (open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
      </button>
      {open && !locked && <div className="px-5 pb-5 border-t border-gray-50 pt-4">{children}</div>}
    </div>
  );
}

function InputField({
  label, value, onChange, placeholder, hint, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 disabled:bg-gray-50 disabled:text-gray-400"
      />
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked, onChange, disabled,
}: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-emerald-500" : "bg-gray-300"} disabled:opacity-60`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ZatcaSettingsView(props: Props) {
  const router = useRouter();
  const isKsa = props.jurisdiction === "KSA";

  // ── Step 1 state — Business Details ──────────────────────────────────────────
  const [crNumber, setCrNumber] = useState(props.crNumber ?? "");
  const [vatNumber, setVatNumber] = useState(props.zatcaVatNumber ?? "");
  const [street, setStreet] = useState(props.zatcaAddress?.street ?? "");
  const [buildingNumber, setBuildingNumber] = useState(props.zatcaAddress?.buildingNumber ?? "");
  const [district, setDistrict] = useState(props.zatcaAddress?.district ?? "");
  const [city, setCity] = useState(props.zatcaAddress?.city ?? "");
  const [postalCode, setPostalCode] = useState(props.zatcaAddress?.postalCode ?? "");
  const [savingDetails, setSavingDetails] = useState(false);

  const step1Done = !!(
    (vatNumber || props.zatcaVatNumber) &&
    (crNumber || props.crNumber) &&
    (city || props.zatcaAddress?.city)
  );

  async function saveBusinessDetails() {
    setSavingDetails(true);
    try {
      const res = await fetch("/api/zatca/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crNumber: crNumber || null,
          zatcaVatNumber: vatNumber || null,
          zatcaAddress: { street, buildingNumber, district, city, postalCode },
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("Business details saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingDetails(false);
    }
  }

  // ── Step 2 state — Connect to Wafeq ──────────────────────────────────────────
  const [connecting, setConnecting] = useState(false);
  const [wafeqAccountId, setWafeqAccountId] = useState(props.wafeqAccountId ?? "");
  const step2Done = !!wafeqAccountId;

  async function connectWafeq() {
    setConnecting(true);
    try {
      const res = await fetch("/api/zatca/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWafeqAccountId(data.data.accountId);
      toast.success(data.data.alreadyConnected ? "Already connected to Wafeq" : "Connected to Wafeq successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect to Wafeq");
    } finally {
      setConnecting(false);
    }
  }

  // ── Step 3 state — Register Device ───────────────────────────────────────────
  const [otp, setOtp] = useState("");
  const [deviceName, setDeviceName] = useState("Maktaby");
  const [registering, setRegistering] = useState(false);
  const [deviceRegistered, setDeviceRegistered] = useState(props.deviceRegistered);
  const step3Done = deviceRegistered;

  async function registerDevice() {
    if (!otp) { toast.error("Enter the OTP from the Fatoorah portal"); return; }
    setRegistering(true);
    try {
      const res = await fetch("/api/zatca/register-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, deviceName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeviceRegistered(true);
      toast.success(`Device "${data.data.deviceName}" registered (${data.data.status})`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Device registration failed");
    } finally {
      setRegistering(false);
    }
  }

  // ── Step 4 state — Test Submission ───────────────────────────────────────────
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; status?: string; wafeqInvoiceId?: string } | null>(null);

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/zatca/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTestResult({ success: true, status: data.data.status, wafeqInvoiceId: data.data.wafeqInvoiceId });
      toast.success("Test submission successful — ZATCA is ready!");
    } catch (err) {
      setTestResult({ success: false });
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  // ── Step 5 state — Go Live ────────────────────────────────────────────────────
  const [enabled, setEnabled] = useState(props.zatcaEnabled);
  const [arabic, setArabic] = useState(props.arabicInvoices);
  const [busyLive, setBusyLive] = useState(false);

  async function updateLive(patch: { zatcaEnabled?: boolean; arabicInvoices?: boolean }) {
    setBusyLive(true);
    try {
      const res = await fetch("/api/zatca/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success("ZATCA settings saved");
      router.refresh();
    } catch (err) {
      if (patch.zatcaEnabled !== undefined) setEnabled(!patch.zatcaEnabled);
      if (patch.arabicInvoices !== undefined) setArabic(!patch.arabicInvoices);
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusyLive(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings" className="p-1.5 rounded-lg hover:bg-black/5">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="page-title">ZATCA E-Invoicing</h1>
          <p className="page-subtitle">Saudi Arabia (KSA) tax-invoice compliance — via Wafeq</p>
        </div>
      </div>

      {/* Jurisdiction notice */}
      {!isKsa && (
        <div className="dashboard-card p-4 flex items-start gap-3 bg-blue-50/40 border-blue-100">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            ZATCA applies to <strong>KSA</strong> tax invoices. Your org's primary jurisdiction is{" "}
            <strong>{props.jurisdiction}</strong>. You can still complete onboarding below if you issue
            invoices in Saudi Arabia.
          </p>
        </div>
      )}

      {!props.wafeqConfigured && (
        <div className="dashboard-card p-4 flex items-start gap-3 bg-amber-50/60 border-amber-100">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">WAFEQ_API_KEY not set</p>
            <p className="text-xs mt-0.5">
              Add <code className="bg-amber-100 px-1 rounded">WAFEQ_API_KEY</code> to your environment
              variables. Steps 1–5 are available to complete setup in advance. Invoices will stay{" "}
              <em>Pending</em> until the key is configured.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 1 — Business Details ─────────────────────────────────────────── */}
      <StepCard
        n={1} title="Business Details" done={step1Done} active={!step1Done}
        locked={false} icon={Building2}
      >
        <p className="text-xs text-gray-500 mb-4">
          These details appear on ZATCA tax invoices and are required by the Fatoorah portal.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="VAT Number (15-digit TIN)"
            value={vatNumber}
            onChange={setVatNumber}
            placeholder="300000000000003"
            hint="Saudi VAT Tax Identification Number"
            disabled={!props.isOwner}
          />
          <InputField
            label="Commercial Registration (CR)"
            value={crNumber}
            onChange={setCrNumber}
            placeholder="1234567890"
            hint="From your CR certificate"
            disabled={!props.isOwner}
          />
          <InputField
            label="Street"
            value={street}
            onChange={setStreet}
            placeholder="King Fahad Road"
            disabled={!props.isOwner}
          />
          <InputField
            label="Building Number"
            value={buildingNumber}
            onChange={setBuildingNumber}
            placeholder="1234"
            disabled={!props.isOwner}
          />
          <InputField
            label="District"
            value={district}
            onChange={setDistrict}
            placeholder="Al Olaya"
            disabled={!props.isOwner}
          />
          <InputField
            label="City"
            value={city}
            onChange={setCity}
            placeholder="Riyadh"
            disabled={!props.isOwner}
          />
          <InputField
            label="Postal Code"
            value={postalCode}
            onChange={setPostalCode}
            placeholder="12345"
            disabled={!props.isOwner}
          />
        </div>
        {props.isOwner && (
          <Button
            size="sm"
            className="mt-4"
            onClick={saveBusinessDetails}
            disabled={savingDetails}
          >
            {savingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : null}
            Save Details
          </Button>
        )}
      </StepCard>

      {/* ── Step 2 — Connect to Wafeq ─────────────────────────────────────────── */}
      <StepCard
        n={2} title="Connect to Wafeq" done={step2Done} active={step1Done && !step2Done}
        locked={false} icon={Plug}
      >
        {step2Done ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-sm text-gray-700">
              Connected · <span className="font-mono text-xs text-gray-500">{wafeqAccountId}</span>
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">
              Wafeq is a ZATCA-certified middleware that handles cryptographic stamping and ZATCA
              API communication on your behalf. A Wafeq account (wacc_*) is created under your
              API key and scoped to this organization.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 mb-4">
              <p className="font-semibold text-gray-700 mb-1">Before connecting:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Complete Step 1 — business details are sent to Wafeq</li>
                <li>Ensure <code className="bg-white px-1 rounded border">WAFEQ_API_KEY</code> is set in your env</li>
              </ol>
            </div>
            {props.isOwner && (
              <Button
                size="sm"
                onClick={connectWafeq}
                disabled={connecting || !props.wafeqConfigured || !step1Done}
              >
                {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Plug className="w-3.5 h-3.5 mr-2" />}
                Connect to Wafeq
              </Button>
            )}
          </>
        )}
      </StepCard>

      {/* ── Step 3 — Register Device ──────────────────────────────────────────── */}
      <StepCard
        n={3} title="Register ZATCA Device" done={step3Done} active={step2Done && !step3Done}
        locked={!step2Done} icon={Cpu}
      >
        {step3Done ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <p className="text-sm text-gray-700">Device registered with ZATCA</p>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 mb-4">
              <p className="font-semibold mb-1">How to get your OTP:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to the ZATCA Fatoorah portal (fatoorah.zatca.gov.sa)</li>
                <li>Go to <strong>Integration</strong> → <strong>Onboarding</strong></li>
                <li>Generate a new OTP — it expires in 1 hour</li>
                <li>Paste it below and click Register</li>
              </ol>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="OTP (from Fatoorah portal)"
                value={otp}
                onChange={setOtp}
                placeholder="123456"
                disabled={!props.isOwner}
              />
              <InputField
                label="Device Name"
                value={deviceName}
                onChange={setDeviceName}
                placeholder="Maktaby"
                hint="Label shown in the ZATCA portal"
                disabled={!props.isOwner}
              />
            </div>
            {props.isOwner && (
              <Button
                size="sm"
                className="mt-4"
                onClick={registerDevice}
                disabled={registering || !otp}
              >
                {registering ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Cpu className="w-3.5 h-3.5 mr-2" />}
                Register Device
              </Button>
            )}
          </>
        )}
      </StepCard>

      {/* ── Step 4 — Test Submission ──────────────────────────────────────────── */}
      <StepCard
        n={4} title="Test Submission" done={!!testResult?.success} active={step3Done}
        locked={!step3Done} icon={FlaskConical}
      >
        <p className="text-xs text-gray-500 mb-4">
          Send a dummy invoice to the ZATCA simulation environment to verify your connection and
          device are working. No real invoice is created.
        </p>
        {testResult && (
          <div
            className={`rounded-lg p-3 text-xs mb-4 ${
              testResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
            }`}
          >
            {testResult.success ? (
              <>
                <p className="font-semibold">Test passed</p>
                {testResult.wafeqInvoiceId && <p>Wafeq ID: {testResult.wafeqInvoiceId}</p>}
                {testResult.status && <p>ZATCA status: {testResult.status}</p>}
              </>
            ) : (
              <p className="font-semibold">Test failed — check the error in your browser console</p>
            )}
          </div>
        )}
        <Button size="sm" onClick={runTest} disabled={testing}>
          {testing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
          ) : (
            <FlaskConical className="w-3.5 h-3.5 mr-2" />
          )}
          Send Test Invoice
        </Button>
      </StepCard>

      {/* ── Step 5 — Go Live ──────────────────────────────────────────────────── */}
      <StepCard
        n={5} title="Go Live" done={enabled} active={step3Done && !enabled}
        locked={false} icon={Rocket}
      >
        <p className="text-xs text-gray-500 mb-4">
          Enable ZATCA e-invoicing to begin stamping and reporting KSA tax invoices. Once live,
          every new KSA invoice will be automatically submitted to ZATCA via Wafeq.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">ZATCA e-invoicing</p>
              <p className="text-xs text-gray-500">
                Phase-1 QR on every KSA invoice + Wafeq reporting
              </p>
            </div>
            <Toggle
              checked={enabled}
              onChange={(next) => { setEnabled(next); updateLive({ zatcaEnabled: next }); }}
              disabled={busyLive || !props.isOwner}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Arabic tax invoices</p>
              <p className="text-xs text-gray-500">
                Mandatory on KSA invoices — bilingual PDF (Arabic + English)
              </p>
            </div>
            <Toggle
              checked={arabic}
              onChange={(next) => { setArabic(next); updateLive({ arabicInvoices: next }); }}
              disabled={busyLive || !props.isOwner}
            />
          </div>

          <Separator />

          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Environment</p>
              <p className="text-xs text-gray-500">
                Set <code className="bg-gray-100 px-1 rounded">ZATCA_ENV=production</code> in your
                environment variables when ready to go live with real invoices.
              </p>
            </div>
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                props.zatcaEnv === "production"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {props.zatcaEnv}
            </span>
          </div>
        </div>

        {!props.isOwner && (
          <p className="text-[11px] text-gray-400 mt-3">Only the workspace owner can change these settings.</p>
        )}
      </StepCard>

      {/* ── Status summary ────────────────────────────────────────────────────── */}
      {Object.keys(props.counts).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {["PENDING", "REPORTED", "CLEARED", "REJECTED"].map((st) => (
            <div key={st} className="dashboard-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{st}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{props.counts[st] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Recent ZATCA invoices ─────────────────────────────────────────────── */}
      {props.recent.length > 0 && (
        <div className="dashboard-card overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Recent ZATCA invoices</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {props.recent.map((r) => {
              const st = STATUS_STYLE[r.zatcaStatus ?? ""] ?? { bg: "bg-gray-100", text: "text-gray-500" };
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {r.invoiceNumber ?? r.id.slice(-8)}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {r.memberName} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {formatCurrency(r.totalAmount, r.currency)}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                    {r.zatcaStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
