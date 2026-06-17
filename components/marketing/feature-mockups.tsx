"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import {
  Mail,
  Truck,
  Clock,
  Check,
  ReceiptText,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/marketing/motion";

/**
 * Idealized mini-UI illustrations for the feature section. They share the hero
 * dashboard card's shell so they read as one family. Visual only (no real
 * logic) and lightweight (CSS/divs, no images). Each one animates its inner
 * elements in on scroll (staggered "settle"), with a couple of subtle live
 * accents. All motion honors prefers-reduced-motion.
 */

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } } };
const item: Variants = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } };

/** Stagger props for a container, disabled under reduced motion. */
function useStagger() {
  const reduce = useReducedMotion();
  return reduce
    ? {}
    : ({ variants: container, initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.4 } } as const);
}

function MockCard({
  title,
  badge,
  badgeTone = "emerald",
  children,
  className,
}: {
  title: string;
  badge?: string;
  badgeTone?: "emerald" | "amber" | "sky";
  children: React.ReactNode;
  className?: string;
}) {
  const tone =
    badgeTone === "amber"
      ? "bg-amber-50 text-amber-700"
      : badgeTone === "sky"
        ? "bg-sky-50 text-sky-700"
        : "bg-emerald-50 text-emerald-700";
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5", className)}>
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <p className="text-sm font-semibold text-zinc-900">{title}</p>
        {badge && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>{badge}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const CAL: { tint: "empty" | "emerald" | "sky" | "amber"; label?: string }[][] = [
  [{ tint: "empty" }, { tint: "emerald", label: "Hot Desk" }, { tint: "empty" }, { tint: "empty" }],
  [{ tint: "empty" }, { tint: "empty" }, { tint: "sky", label: "Booth" }, { tint: "empty" }],
  [{ tint: "sky", label: "Room A" }, { tint: "empty" }, { tint: "empty" }, { tint: "emerald" }],
  [{ tint: "empty" }, { tint: "amber", label: "Office" }, { tint: "amber" }, { tint: "empty" }],
  [{ tint: "empty" }, { tint: "empty" }, { tint: "emerald", label: "Desk" }, { tint: "empty" }],
];
const CAL_TINT: Record<string, string> = {
  empty: "bg-zinc-50",
  emerald: "bg-emerald-100 text-emerald-700",
  sky: "bg-sky-100 text-sky-700",
  amber: "bg-amber-100 text-amber-700",
};

export function WorkspaceMock() {
  const stagger = useStagger();
  return (
    <MockCard title="This week" badge="Live">
      <div className="grid grid-cols-5 gap-1.5">
        {DAYS.map((d) => (
          <p key={d} className="text-center text-[10px] font-medium text-zinc-400">{d}</p>
        ))}
      </div>
      <motion.div className="mt-1.5 grid grid-cols-5 gap-1.5" {...stagger}>
        {CAL.map((col, ci) => (
          <motion.div key={ci} variants={item} className="flex flex-col gap-1.5">
            {col.map((slot, si) => (
              <div
                key={si}
                className={cn(
                  "flex h-7 items-center justify-center rounded-md px-1 text-[9px] font-semibold",
                  CAL_TINT[slot.tint]
                )}
              >
                {slot.label}
              </div>
            ))}
          </motion.div>
        ))}
      </motion.div>
    </MockCard>
  );
}

export function VirtualOfficeMock() {
  const stagger = useStagger();
  const rows = [
    { icon: Mail, who: "Federal Tax Authority", meta: "Letter", chip: "Scanned", tone: "bg-emerald-50 text-emerald-700" },
    { icon: Truck, who: "Aramex courier", meta: "Parcel", chip: "Forwarded", tone: "bg-sky-50 text-sky-700" },
  ];
  return (
    <MockCard title="Mailroom" badge="3 new">
      <motion.div className="space-y-2" {...stagger}>
        {rows.map((r) => (
          <motion.div key={r.who} variants={item} className="flex items-center gap-3 rounded-xl border border-zinc-100 p-2.5">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100">
              <r.icon className="h-4 w-4 text-zinc-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-zinc-900">{r.who}</p>
              <p className="text-[11px] text-zinc-400">{r.meta}</p>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", r.tone)}>{r.chip}</span>
          </motion.div>
        ))}
        <motion.div variants={item} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Clock className="h-4 w-4 text-amber-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-amber-800">Address renewal</p>
            <p className="text-[11px] text-amber-600/80">Due in 14 days</p>
          </div>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Renew</span>
        </motion.div>
      </motion.div>
    </MockCard>
  );
}

export function FormationMock() {
  const stagger = useStagger();
  const stages = ["New", "Proposal", "In progress", "Licensed"];
  return (
    <MockCard title="Setup pipeline" badge="12 leads">
      <motion.div className="grid grid-cols-4 gap-2" {...stagger}>
        {stages.map((s, i) => (
          <motion.div key={s} variants={item} className="space-y-1.5">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{s}</p>
            {i === 1 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                <p className="text-[10px] font-semibold text-emerald-800">Riyadh LLC</p>
                <p className="mt-0.5 flex items-center gap-1 text-[9px] text-emerald-600">
                  MISA <ArrowRight className="h-2.5 w-2.5" />
                </p>
              </div>
            ) : (
              <div className="h-12 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/70" />
            )}
          </motion.div>
        ))}
      </motion.div>
    </MockCard>
  );
}

export function ProMock() {
  const stagger = useStagger();
  const reduce = useReducedMotion();
  const steps = [
    { label: "Documents collected", done: true },
    { label: "Submitted to GDRFA", done: true },
    { label: "Visa stamping", active: true },
    { label: "Issued", done: false },
  ];
  return (
    <MockCard title="Visa application" badge="2 days left" badgeTone="amber">
      <motion.ol className="space-y-3" {...stagger}>
        {steps.map((s) => (
          <motion.li key={s.label} variants={item} className="flex items-center gap-3">
            <span
              className={cn(
                "relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
                s.done ? "bg-emerald-100" : s.active ? "bg-emerald-600" : "border border-zinc-200 bg-white"
              )}
            >
              {s.done ? (
                <Check className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2.5} />
              ) : s.active ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-white" />
                  {!reduce && (
                    <motion.span
                      className="absolute inset-0 rounded-full ring-2 ring-emerald-500"
                      animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </>
              ) : null}
            </span>
            <span className={cn("text-xs", s.active ? "font-semibold text-zinc-900" : s.done ? "text-zinc-500" : "text-zinc-400")}>
              {s.label}
            </span>
          </motion.li>
        ))}
      </motion.ol>
    </MockCard>
  );
}

export function InvoiceMock() {
  const stagger = useStagger();
  return (
    <MockCard title="Tax invoice" badge="ZATCA">
      <motion.div {...stagger}>
        <motion.div variants={item} className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <ReceiptText className="h-4 w-4 text-emerald-700" />
          </span>
          <p className="flex-1 text-xs font-medium text-zinc-700">Meeting Room A, 20 hrs</p>
          <p className="text-xs font-semibold text-zinc-900">AED 1,000</p>
        </motion.div>
        <dl className="mt-3 space-y-2 text-xs">
          <motion.div variants={item} className="flex justify-between text-zinc-500">
            <dt>Subtotal</dt>
            <dd className="font-medium text-zinc-700">AED 1,000.00</dd>
          </motion.div>
          <motion.div variants={item} className="flex justify-between text-zinc-500">
            <dt>VAT (5%)</dt>
            <dd className="font-medium text-zinc-700">AED 50.00</dd>
          </motion.div>
          <motion.div variants={item} className="flex justify-between border-t border-zinc-100 pt-2 text-sm">
            <dt className="font-semibold text-zinc-900">Total</dt>
            <dd className="font-bold text-emerald-700">
              <CountUp value={1050} prefix="AED " suffix=".00" />
            </dd>
          </motion.div>
        </dl>
      </motion.div>
    </MockCard>
  );
}

export function WhatsAppMock() {
  const stagger = useStagger();
  const reduce = useReducedMotion();
  return (
    <MockCard title="Member chat" badge="Online">
      <motion.div className="space-y-2" {...stagger}>
        <motion.div variants={item} className="max-w-[80%] rounded-2xl rounded-tl-sm bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
          Is a hot desk free tomorrow morning?
        </motion.div>
        <motion.div variants={item} className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-600 px-3 py-2 text-xs text-white">
          Yes, 9am is open. Want me to book it?
        </motion.div>
        <motion.div variants={item} className="ml-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-tr-sm border border-emerald-100 bg-emerald-50 px-3 py-2">
          <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" strokeWidth={2.5} />
          <span className="text-xs font-medium text-emerald-800">Booking confirmed for 9:00 am</span>
        </motion.div>
        <motion.div variants={item} className="flex items-center gap-1.5 pl-1 pt-0.5">
          <MessageCircle className="h-3 w-3 text-zinc-300" />
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-zinc-300"
                animate={reduce ? undefined : { y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                transition={reduce ? undefined : { duration: 1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
              />
            ))}
          </span>
        </motion.div>
      </motion.div>
    </MockCard>
  );
}
