import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Action = { label: string; href?: string; onClick?: () => void };

/**
 * Guided empty state — explains what a section is for and the first thing to do.
 * Use across module pages so new operators always know how to start.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  primary,
  steps,
}: {
  icon: any;
  title: string;
  description: string;
  primary?: Action;
  /** Optional 2–4 short "how it works" lines. */
  steps?: string[];
}) {
  const btn = (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white"
      style={{ background: "linear-gradient(135deg, #15803D, #22C55E)" }}>
      {primary?.label} <ArrowRight className="w-3.5 h-3.5" />
    </span>
  );

  return (
    <div className="dashboard-card px-6 py-12 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "rgba(21,128,61,0.08)" }}>
        <Icon className="w-7 h-7" style={{ color: "#15803D" }} />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">{description}</p>

      {steps && steps.length > 0 && (
        <div className="mt-5 max-w-sm mx-auto space-y-2 text-left">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <p className="text-xs text-gray-500">{s}</p>
            </div>
          ))}
        </div>
      )}

      {primary && (
        <div className="mt-6">
          {primary.href ? (
            <Link href={primary.href}>{btn}</Link>
          ) : (
            <button onClick={primary.onClick}>{btn}</button>
          )}
        </div>
      )}
    </div>
  );
}
