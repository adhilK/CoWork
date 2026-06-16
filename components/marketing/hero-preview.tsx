"use client";

import { motion, useReducedMotion } from "motion/react";
import { CalendarCheck, Mailbox, Landmark, Stamp, MessageCircle } from "lucide-react";
import { CountUp } from "@/components/marketing/motion";

const ROWS = [
  { icon: CalendarCheck, title: "12 bookings today", meta: "2 awaiting check-in", tint: "#16A34A", bg: "#DCFCE7" },
  { icon: Mailbox, title: "3 virtual-office renewals due", meta: "Reminders sent on WhatsApp", tint: "#0EA5E9", bg: "#E0F2FE" },
  { icon: Landmark, title: "New setup lead, Riyadh LLC", meta: "MISA mainland · proposal sent", tint: "#7C3AED", bg: "#F5F3FF" },
  { icon: Stamp, title: "Visa stamping in progress", meta: "GDRFA · due in 2 days", tint: "#D97706", bg: "#FEF3C7" },
  { icon: MessageCircle, title: "2 new WhatsApp messages", meta: "Member support thread", tint: "#15803D", bg: "#DCFCE7" },
];

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * The hero's live "five businesses, one screen" dashboard preview. Rows settle
 * into place on load (staggered) and the headline figures count up. A real
 * component preview, not a static screenshot image. Reduced-motion safe.
 */
export function HeroPreview() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
  };
  const item = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Today at LaunchHub Coworking</p>
          <p className="text-xs text-zinc-400">Dubai · 1 of 3 locations</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <CountUp value={48200} prefix="AED " /> this month
        </span>
      </div>

      <motion.ul
        className="divide-y divide-zinc-50"
        variants={reduce ? undefined : container}
        initial={reduce ? undefined : "hidden"}
        animate={reduce ? undefined : "show"}
      >
        {ROWS.map((row, i) => (
          <motion.li
            key={row.title}
            variants={reduce ? undefined : item}
            className="flex items-center gap-3 px-5 py-3.5"
          >
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: row.bg }}>
              <row.icon className="h-[18px] w-[18px]" style={{ color: row.tint }} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-900">
                {i === 0 ? (
                  <>
                    <CountUp value={12} /> bookings today
                  </>
                ) : (
                  row.title
                )}
              </p>
              <p className="truncate text-xs text-zinc-400">{row.meta}</p>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}
