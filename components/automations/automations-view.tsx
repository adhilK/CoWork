"use client";

import { useState } from "react";
import {
  Zap, Clock, CalendarClock, MessageCircle, Megaphone, FileWarning, Play, Loader2,
  CheckCircle2, AlertTriangle, Plug, Receipt, IdCard, Building2, Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  inngestConnected: boolean;
  activity: Record<string, number>;
  upcoming: { visaSoon: number; docsSoon: number; voRenewals: number; overdueReqs: number };
};

const SCHEDULED = [
  {
    id: "monthly-billing" as const,
    name: "Monthly billing",
    icon: Receipt,
    schedule: "1st of month · 06:00",
    desc: "Generates membership invoices for the new period, resets booking credits, and notifies members by email + WhatsApp.",
  },
  {
    id: "daily-reminders" as const,
    name: "Daily reminders",
    icon: CalendarClock,
    schedule: "Every day · 07:00",
    desc: "Scans for expiring visas, documents, virtual-office renewals, trade licenses, and overdue document requests — and reminds members.",
  },
];

const QUEUES = [
  { name: "WhatsApp send", icon: MessageCircle, desc: "Delivers individual WhatsApp messages with automatic retries.", trigger: "Event-driven" },
  { name: "WhatsApp broadcast", icon: Megaphone, desc: "Fans out a broadcast to many members without blocking the request.", trigger: "Event-driven" },
  { name: "ZATCA submit", icon: FileWarning, desc: "KSA e-invoicing submission queue (Phase 2 stub — wired for Phase 3).", trigger: "Event-driven" },
];

const ACTIVITY_LABELS: { key: string; label: string; icon: any }[] = [
  { key: "INVOICE_ISSUED", label: "Invoices sent", icon: Receipt },
  { key: "RENEWAL_REMINDER", label: "Renewal reminders", icon: IdCard },
  { key: "DOCUMENT_EXPIRY", label: "Document reminders", icon: FileWarning },
  { key: "ANNOUNCEMENT", label: "Broadcasts", icon: Megaphone },
];

export function AutomationsView({ inngestConnected, activity, upcoming }: Props) {
  const [running, setRunning] = useState<string | null>(null);

  async function runJob(job: "monthly-billing" | "daily-reminders") {
    setRunning(job);
    try {
      const res = await fetch("/api/automations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const json = await res.json();
      if (json.queued) {
        toast.success("Job queued — it'll run in the background");
      } else if (json.result) {
        const r = json.result;
        const summary = job === "monthly-billing"
          ? `${r.created} invoice(s) created, ${r.skipped} skipped`
          : `${r.total} reminder(s) sent`;
        toast.success(`Done — ${summary}`);
      } else {
        toast.success("Job completed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run job");
    } finally {
      setRunning(null);
    }
  }

  const totalUpcoming = upcoming.visaSoon + upcoming.docsSoon + upcoming.voRenewals + upcoming.overdueReqs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Automations</h1>
        <p className="page-subtitle">Scheduled jobs and background queues that run your operations on autopilot</p>
      </div>

      {/* Runner status */}
      <div className={`dashboard-card p-4 flex items-center gap-3 ${inngestConnected ? "" : "border-amber-200 bg-amber-50/40"}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${inngestConnected ? "bg-green-50" : "bg-amber-100"}`}>
          <Plug className={`w-5 h-5 ${inngestConnected ? "text-green-600" : "text-amber-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {inngestConnected ? "Job queue connected (Inngest)" : "Running in cron-fallback mode"}
          </p>
          <p className="text-xs text-gray-500">
            {inngestConnected
              ? "Jobs run on the Inngest queue with retries and step durability."
              : "Inngest isn't configured — scheduled jobs run via Vercel Cron, and queues run inline. Set INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY to enable the full queue."}
          </p>
        </div>
        {inngestConnected
          ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
      </div>

      {/* Scheduled jobs */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" /> Scheduled jobs
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {SCHEDULED.map((job) => (
            <div key={job.id} className="dashboard-card p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(21,128,61,0.1)" }}>
                  <job.icon style={{ width: 20, height: 20, color: "#15803D" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{job.name}</p>
                  <p className="text-[11px] text-gray-400 inline-flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {job.schedule}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{job.desc}</p>
              <div className="pt-1 border-t border-gray-50">
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={running === job.id}
                  onClick={() => runJob(job.id)}>
                  {running === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                  Run now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming reminder workload */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-gray-400" /> Upcoming reminders <span className="text-[11px] font-normal text-gray-400">(next 30 days)</span>
        </h2>
        {totalUpcoming === 0 ? (
          <div className="dashboard-card p-6 text-center text-sm text-gray-400">Nothing due in the next 30 days — you're all clear.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Visa expiries", value: upcoming.visaSoon, icon: IdCard, color: "#D97706", bg: "rgba(217,119,6,0.1)" },
              { label: "Document expiries", value: upcoming.docsSoon, icon: FileWarning, color: "#2563EB", bg: "rgba(37,99,235,0.1)" },
              { label: "VO renewals", value: upcoming.voRenewals, icon: Building2, color: "#7C3AED", bg: "rgba(124,58,237,0.1)" },
              { label: "Overdue requests", value: upcoming.overdueReqs, icon: Inbox, color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
            ].map((s) => (
              <div key={s.label} className="dashboard-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                    <s.icon style={{ width: 18, height: 18, color: s.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity (last 7 days) */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-gray-400" /> Automated messages <span className="text-[11px] font-normal text-gray-400">(last 7 days)</span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ACTIVITY_LABELS.map((a) => (
            <div key={a.key} className="dashboard-card p-5">
              <div className="flex items-center gap-2">
                <a.icon className="w-4 h-4 text-gray-300" />
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{a.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activity[a.key] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Queues */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-gray-400" /> Background queues
        </h2>
        <div className="dashboard-card divide-y divide-gray-50">
          {QUEUES.map((q) => (
            <div key={q.name} className="flex items-center gap-3 px-5 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                <q.icon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{q.name}</p>
                <p className="text-[11px] text-gray-400">{q.desc}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">{q.trigger}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
