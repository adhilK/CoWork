"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Rocket, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SetupStep = {
  title: string;
  desc: string;
  href: string;
  cta: string;
  done: boolean;
  optional?: boolean;
};

/**
 * Guided first-run checklist. Shows operators exactly what to do next, in order,
 * and detects what's already complete. Rendered on the dashboard while setup is
 * incomplete; it naturally disappears once the essential steps are done.
 */
export function GettingStarted({ steps, orgName }: { steps: SetupStep[]; orgName: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((doneCount / total) * 100);
  // The first not-yet-done step is the "current" one to highlight.
  const nextIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="dashboard-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ background: "linear-gradient(120deg, rgba(21,128,61,0.06), rgba(34,197,94,0.03))" }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
          <Rocket className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Get {orgName} up and running</p>
          <p className="text-xs text-gray-500">{doneCount} of {total} steps done — follow these to set up your space.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="w-28 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #15803D, #22C55E)" }} />
          </div>
          <span className="text-xs font-bold text-emerald-700 w-9 text-right">{pct}%</span>
        </div>
        <button onClick={() => setCollapsed((c) => !c)} className="p-1 rounded-md hover:bg-black/5 text-gray-400">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-gray-50">
          {steps.map((step, i) => {
            const isNext = i === nextIdx;
            return (
              <div key={step.title} className={cn("flex items-center gap-3 px-5 py-3", isNext && "bg-emerald-50/40")}>
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <span className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                    isNext ? "border-emerald-500 text-emerald-600" : "border-gray-200 text-gray-300")}>
                    {i + 1}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", step.done ? "text-gray-400 line-through" : "text-gray-900")}>
                    {step.title}
                    {step.optional && !step.done && <span className="ml-1.5 text-[10px] font-semibold text-gray-300 uppercase tracking-wide">optional</span>}
                  </p>
                  {!step.done && <p className="text-[11px] text-gray-400 mt-0.5">{step.desc}</p>}
                </div>
                {!step.done && (
                  <Link href={step.href}>
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors",
                      isNext ? "text-white" : "text-emerald-700 hover:bg-emerald-50 border border-emerald-100")}
                      style={isNext ? { background: "linear-gradient(135deg, #15803D, #22C55E)" } : undefined}>
                      {step.cta} <ArrowRight className="w-3 h-3" />
                    </span>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
