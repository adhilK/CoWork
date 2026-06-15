import Link from "next/link";
import {
  CalendarCheck,
  Mailbox,
  Landmark,
  Stamp,
  MessageCircle,
  ShieldCheck,
  ReceiptText,
  Users,
  ArrowRight,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { PricingSection } from "@/components/marketing/pricing-section";

export const dynamic = "force-static";

// ── Shared bits ────────────────────────────────────────────────────────────

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98]"
      style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
    >
      {children}
    </Link>
  );
}

function SecondaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
    >
      {children}
    </Link>
  );
}

// ── The five business lines, used in a couple of sections ───────────────────

const MODULES = [
  { icon: CalendarCheck, label: "Workspace", line: "Bookings, desks, rooms, QR check-in" },
  { icon: Mailbox, label: "Virtual office", line: "Registered addresses and mail" },
  { icon: Landmark, label: "Company formation", line: "Lead pipeline to trade license" },
  { icon: Stamp, label: "PRO services", line: "Visas, attestation, renewals" },
  { icon: Users, label: "Community", line: "Members, events, referrals" },
  { icon: ReceiptText, label: "Billing and VAT", line: "Invoices, AED and SAR, ZATCA" },
];

export default function MarketingPage() {
  return (
    <>
      {/* ── 1. HERO ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 0%, rgba(34,197,94,0.10), transparent 70%), radial-gradient(50% 40% at 0% 10%, rgba(21,128,61,0.06), transparent 70%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-16 pb-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-24 lg:pb-28">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Built for the UAE and Saudi, not adapted for it
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              Coworking software stops at the desk. GCC operators don&apos;t.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-600">
              One platform for workspace, virtual offices, company formation, and PRO services. Built for the UAE and Saudi from day one.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta href="/register">
                Start free trial <ArrowRight className="h-4 w-4" />
              </PrimaryCta>
              <SecondaryCta href="/register?intent=demo">Book a demo</SecondaryCta>
            </div>
          </div>

          {/* Honest live UI preview: one screen, five businesses */}
          <div className="relative">
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Today at LaunchHub Coworking</p>
                  <p className="text-xs text-zinc-400">Dubai · 1 of 3 locations</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  AED 48,200 this month
                </span>
              </div>
              <ul className="divide-y divide-zinc-50">
                {[
                  { icon: CalendarCheck, title: "12 bookings today", meta: "2 awaiting check-in", tint: "#16A34A", bg: "#DCFCE7" },
                  { icon: Mailbox, title: "3 virtual-office renewals due", meta: "Reminders sent on WhatsApp", tint: "#0EA5E9", bg: "#E0F2FE" },
                  { icon: Landmark, title: "New setup lead, Riyadh LLC", meta: "MISA mainland · proposal sent", tint: "#7C3AED", bg: "#F5F3FF" },
                  { icon: Stamp, title: "Visa stamping in progress", meta: "GDRFA · due in 2 days", tint: "#D97706", bg: "#FEF3C7" },
                  { icon: MessageCircle, title: "2 new WhatsApp messages", meta: "Member support thread", tint: "#15803D", bg: "#DCFCE7" },
                ].map((row) => (
                  <li key={row.title} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: row.bg }}>
                      <row.icon className="h-[18px] w-[18px]" style={{ color: row.tint }} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">{row.title}</p>
                      <p className="truncate text-xs text-zinc-400">{row.meta}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. SOCIAL PROOF ───────────────────────────────────────────── */}
      <section className="border-y border-zinc-100 bg-zinc-50/60 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-zinc-500">
            Trusted by workspace and business-setup operators across the GCC
          </p>
          <div className="mt-7 grid grid-cols-2 items-center gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { mark: "NW", name: "Nawah Workspaces" },
              { mark: "MB", name: "Marsa Business Hub" },
              { mark: "QO", name: "Qasr Offices" },
              { mark: "LC", name: "Liwan Coworking" },
              { mark: "AS", name: "Astrolabe Spaces" },
            ].map((logo) => (
              <div key={logo.mark} className="flex items-center justify-center gap-2.5 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
                  {logo.mark}
                </span>
                <span className="text-sm font-semibold tracking-tight text-zinc-700">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. THE PROBLEM ────────────────────────────────────────────── */}
      <section id="problem" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              One operator. Five businesses. A dozen browser tabs.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-600">
              In the GCC, a workspace is never just desks. You run virtual offices, company formation, PRO and visa
              work, and a member community. Then you stitch it together on WhatsApp chats, Excel sheets, and software
              built for WeWork-style desk rental. Renewals slip. VAT gets messy. Clients wait.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Renewals tracked in spreadsheets", body: "Trade licenses, visas, and virtual-office contracts expire on dates nobody is watching." },
              { title: "Client updates lost in WhatsApp", body: "Status requests pile up in personal chats with no record, no SLA, and no handover." },
              { title: "VAT done by hand", body: "5 percent in the UAE, 15 percent in Saudi, Arabic invoices, ZATCA. Easy to get wrong, costly to fix." },
              { title: "Western tools that stop at the desk", body: "Booking software has no idea what a PRO service or a MISA license even is." },
              { title: "Revenue you cannot see", body: "Formation and PRO fees live outside the system, so you never see what each line really earns." },
              { title: "A team switching apps all day", body: "Reception, PRO agents, and setup consultants each work in a different tool." },
            ].map((p) => (
              <div key={p.title} className="rounded-2xl border border-zinc-200 bg-white p-6">
                <h3 className="text-base font-semibold text-zinc-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. THE SOLUTION ───────────────────────────────────────────── */}
      <section className="border-t border-zinc-100 bg-zinc-50/60 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              One platform for everything you actually do
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-600">
              CoWork Pro unifies the five businesses GCC operators run, with UAE and Saudi compliance built in, not
              bolted on. One login, one bill, one source of truth.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((m) => (
                <div key={m.label} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <m.icon className="h-5 w-5 text-emerald-700" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{m.label}</p>
                    <p className="truncate text-xs text-zinc-500">{m.line}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FEATURE HIGHLIGHTS (bento with rhythm) ─────────────────── */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              The modules that make you money, not just manage desks
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Workspace - wide spotlight */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-7 md:col-span-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <CalendarCheck className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-zinc-900">Workspace that runs itself</h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
                Bookings, desks, meeting rooms, QR check-in, credits, and recurring reservations. Members book and pay
                from their own portal, so your front desk stops being a booking clerk.
              </p>
            </div>

            {/* Virtual office */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50">
                <Mailbox className="h-5 w-5 text-sky-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-zinc-900">Virtual office revenue</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Sell registered addresses, log mail and couriers, and auto-bill renewals. High margin, low effort.
              </p>
            </div>

            {/* Business setup */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
                <Landmark className="h-5 w-5 text-violet-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-zinc-900">Company formation CRM</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Track leads from first enquiry to trade license. License catalog, proposals, and application stages for
                mainland, freezone, and Saudi MISA.
              </p>
            </div>

            {/* PRO services */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
                <Stamp className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-zinc-900">PRO and visa tracking</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Manage visas, attestation, Qiwa and Muqeem tasks with SLAs and a client-visible status. Nothing expires
                by surprise.
              </p>
            </div>

            {/* WhatsApp */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-7">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                <MessageCircle className="h-5 w-5 text-emerald-700" />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-zinc-900">WhatsApp-native</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Confirmations, reminders, and two-way support on the channel your members actually read. Email is the
                backup, not the default.
              </p>
            </div>

            {/* Compliance - wide */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-7 md:col-span-3">
              <div className="flex items-start gap-5">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-zinc-900">VAT and ZATCA compliance, handled</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600">
                    Every invoice splits subtotal, VAT, and total automatically: 5 percent in the UAE, 15 percent in
                    Saudi. Arabic tax invoices and ZATCA e-invoicing are built in, so you stay compliant without a
                    separate accountant in the loop.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. WHY COWORK PRO vs WESTERN TOOLS ────────────────────────── */}
      <section id="compare" className="border-t border-zinc-100 bg-zinc-50/60 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-emerald-700">Why CoWork Pro</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
              The difference between built-for-the-GCC and translated-for-it
            </h2>
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/80">
                    <th className="px-5 py-4 font-semibold text-zinc-500">Capability</th>
                    <th className="px-5 py-4 text-center font-semibold text-emerald-700">CoWork Pro</th>
                    <th className="px-5 py-4 text-center font-semibold text-zinc-500">Western tools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {[
                    { cap: "Desk and room bookings", us: true, them: "yes" },
                    { cap: "Member billing and invoicing", us: true, them: "yes" },
                    { cap: "Virtual office and mail handling", us: true, them: "Limited" },
                    { cap: "Company formation CRM", us: true, them: false },
                    { cap: "PRO and visa tracking", us: true, them: false },
                    { cap: "WhatsApp-native messaging", us: true, them: "Email first" },
                    { cap: "VAT and ZATCA e-invoicing", us: true, them: false },
                    { cap: "Arabic tax invoices", us: true, them: false },
                    { cap: "Local payments and AED, SAR pricing", us: true, them: "Cards only" },
                  ].map((row) => (
                    <tr key={row.cap}>
                      <td className="px-5 py-4 font-medium text-zinc-800">{row.cap}</td>
                      <td className="px-5 py-4 text-center">
                        <Check className="mx-auto h-5 w-5 text-emerald-600" />
                      </td>
                      <td className="px-5 py-4 text-center">
                        {row.them === false ? (
                          <X className="mx-auto h-5 w-5 text-zinc-300" />
                        ) : row.them === "yes" ? (
                          <Check className="mx-auto h-5 w-5 text-zinc-300" />
                        ) : (
                          <span className="text-xs font-medium text-zinc-400">{row.them}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-zinc-400">
            Western tools refers to desk-rental platforms such as Nexudus, OfficeRnD, and Optix.
          </p>
        </div>
      </section>

      {/* ── 7. PRICING ────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ── 8. FAQ ────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Questions operators ask us
          </h2>
          <div className="mt-10 divide-y divide-zinc-100 border-y border-zinc-100">
            {[
              {
                q: "Do I need separate tools for company formation and PRO services?",
                a: "No. CoWork Pro runs your lead pipeline, license catalog, proposals, and visa and PRO tasks alongside your workspace, so one team works from one system.",
              },
              {
                q: "Is it compliant with UAE VAT and Saudi ZATCA?",
                a: "Yes. Invoices split subtotal, VAT, and total automatically at 5 percent for the UAE and 15 percent for Saudi, with Arabic tax invoices and ZATCA e-invoicing for Saudi operators.",
              },
              {
                q: "Can members and clients use WhatsApp instead of email?",
                a: "Yes. WhatsApp is native. Booking confirmations, renewal reminders, visitor alerts, and two-way support all run on WhatsApp, with email as the backup.",
              },
              {
                q: "Does it work for a single space or only multi-site operators?",
                a: "Both. Start with one location on Starter, then add locations, franchise mode, and per-location reporting as you grow.",
              },
              {
                q: "Can I move over from Nexudus, OfficeRnD, or spreadsheets?",
                a: "Yes. Import your members, plans, and resources, and we help you map your current setup during onboarding.",
              },
              {
                q: "How fast can we go live?",
                a: "Most operators run their first real booking and invoice within a day. The formation and PRO modules switch on whenever you are ready for them.",
              },
            ].map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-zinc-900">
                  {item.q}
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. FINAL CTA ──────────────────────────────────────────────── */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div
          className="mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-12"
          style={{ background: "linear-gradient(135deg, #15803D 0%, #16A34A 55%, #22C55E 100%)" }}
        >
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Stop juggling five businesses across five tools
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-emerald-50">
            Run your whole GCC operation from one platform. Free for 14 days, no card required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-emerald-800 transition-transform active:scale-[0.98]"
            >
              Start free trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register?intent=demo"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
