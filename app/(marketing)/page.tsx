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
  CalendarClock,
  Calculator,
  Unplug,
  EyeOff,
  Shuffle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PricingSection } from "@/components/marketing/pricing-section";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { SectionEdge } from "@/components/marketing/section-edge";
import {
  WorkspaceMock,
  VirtualOfficeMock,
  FormationMock,
  ProMock,
  InvoiceMock,
  WhatsAppMock,
} from "@/components/marketing/feature-mockups";
import { Reveal, StaggerGroup, StaggerItem } from "@/components/marketing/motion";

export const dynamic = "force-static";

// ── Shared bits ────────────────────────────────────────────────────────────

function Eyebrow({
  children,
  center,
  tone = "light",
}: {
  children: React.ReactNode;
  center?: boolean;
  tone?: "light" | "dark" | "green";
}) {
  const lineCls = tone === "green" ? "bg-white/60" : tone === "dark" ? "bg-emerald-400/50" : "bg-emerald-500/50";
  const textCls = tone === "green" ? "text-white" : tone === "dark" ? "text-emerald-400" : "text-emerald-600";
  return (
    <div className={cn("flex items-center gap-2.5", center && "justify-center")}>
      <span className={cn("h-px w-7", lineCls)} />
      <span className={cn("font-heading text-xs font-medium uppercase tracking-[0.15em]", textCls)}>
        {children}
      </span>
    </div>
  );
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[10px] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
      style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
    >
      {children}
    </Link>
  );
}

// Weav-style tonal button: translucent emerald-tint fill, no hard border,
// low contrast, same size/radius as the primary.
function SecondaryCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-emerald-600/10 px-6 py-3 text-sm font-semibold text-emerald-700 transition-all hover:-translate-y-0.5 hover:bg-emerald-600/15"
    >
      {children}
    </Link>
  );
}

// Feature copy block (icon tile + title + body), paired with a mockup.
function FeatureCopy({
  icon: Icon,
  tileBg,
  tileFg,
  title,
  children,
}: {
  icon: any;
  tileBg: string;
  tileFg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", tileBg)}>
        <Icon className={cn("h-5 w-5", tileFg)} />
      </span>
      <h3 className="mt-5 font-heading text-2xl font-bold tracking-[-0.01em] text-zinc-900">{title}</h3>
      <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-600">{children}</p>
    </div>
  );
}

// The five business lines, shown in the dark solution section.
const MODULES = [
  { icon: CalendarCheck, label: "Workspace", line: "Bookings, desks, rooms, QR check-in" },
  { icon: Mailbox, label: "Virtual office", line: "Registered addresses and mail" },
  { icon: Landmark, label: "Company formation", line: "Lead pipeline to trade license" },
  { icon: Stamp, label: "PRO services", line: "Visas, attestation, renewals" },
  { icon: Users, label: "Community", line: "Members, events, referrals" },
  { icon: ReceiptText, label: "Billing and VAT", line: "Invoices, AED and SAR, ZATCA" },
];

const PROBLEMS = [
  { icon: CalendarClock, title: "Renewals tracked in spreadsheets", body: "Trade licenses, visas, and virtual-office contracts expire on dates nobody is watching." },
  { icon: MessageCircle, title: "Client updates lost in WhatsApp", body: "Status requests pile up in personal chats with no record, no SLA, and no handover." },
  { icon: Calculator, title: "VAT done by hand", body: "5 percent in the UAE, 15 percent in Saudi, Arabic invoices, ZATCA. Easy to get wrong, costly to fix." },
  { icon: Unplug, title: "Western tools that stop at the desk", body: "Booking software has no idea what a PRO service or a MISA license even is." },
  { icon: EyeOff, title: "Revenue you cannot see", body: "Formation and PRO fees live outside the system, so you never see what each line really earns." },
  { icon: Shuffle, title: "A team switching apps all day", body: "Reception, PRO agents, and setup consultants each work in a different tool." },
];

const COMPARE_ROWS: { cap: string; us: true; them: boolean | string }[] = [
  { cap: "Desk and room bookings", us: true, them: "yes" },
  { cap: "Member billing and invoicing", us: true, them: "yes" },
  { cap: "Virtual office and mail handling", us: true, them: "Limited" },
  { cap: "Company formation CRM", us: true, them: false },
  { cap: "PRO and visa tracking", us: true, them: false },
  { cap: "WhatsApp-native messaging", us: true, them: "Email first" },
  { cap: "VAT and ZATCA e-invoicing", us: true, them: false },
  { cap: "Arabic tax invoices", us: true, them: false },
  { cap: "Local payments and AED, SAR pricing", us: true, them: "Cards only" },
];

const FAQS = [
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
];

export default function MarketingPage() {
  return (
    <>
      {/* ── 1. HERO ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="hero-aurora pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 50% at 80% 0%, rgba(34,197,94,0.12), transparent 70%), radial-gradient(50% 40% at 0% 10%, rgba(21,128,61,0.07), transparent 70%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pt-16 pb-24 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pt-24 lg:pb-28">
          <Reveal>
            <Eyebrow>For UAE &amp; Saudi operators</Eyebrow>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-zinc-900 sm:text-5xl lg:text-6xl">
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
          </Reveal>

          {/* Elevated card frame: emerald glow, a peek layer behind, and a
              faint dot-grid for depth (Ruul/Fun floating-card feel). */}
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-8 -top-10 -bottom-6 -z-10 rounded-[2rem] opacity-70 blur-2xl"
              style={{ background: "radial-gradient(50% 50% at 60% 40%, rgba(34,197,94,0.22), transparent 75%)" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 translate-x-5 translate-y-6 rounded-2xl border border-zinc-200/70 bg-white/50"
            />
            <HeroPreview />
            <div className="pointer-events-none absolute -left-4 bottom-8 hidden items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-lg shadow-zinc-900/5 sm:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </span>
              <span className="text-xs font-medium text-zinc-700">All synced</span>
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
          <div className="mt-7">
            <LogoMarquee />
          </div>
        </div>
      </section>

      {/* ── 3. THE PROBLEM ────────────────────────────────────────────── */}
      <section id="problem" className="relative py-24 sm:py-32">
        {/* Soft green bleed at the bottom so the next section's wave rises out
            of a tinted zone instead of a hard white edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44"
          style={{ background: "radial-gradient(60% 100% at 50% 100%, rgba(34,197,94,0.12), transparent 72%)" }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow center>The problem</Eyebrow>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-[-0.02em] text-zinc-900 sm:text-4xl">
              One operator. Five businesses. A dozen browser tabs.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-600">
              In the GCC, a workspace is never just desks. You run virtual offices, company formation, PRO and visa
              work, and a member community. Then you stitch it together on WhatsApp chats, Excel sheets, and software
              built for WeWork-style desk rental. Renewals slip. VAT gets messy. Clients wait.
            </p>
          </Reveal>

          <StaggerGroup className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map((p) => (
              <StaggerItem key={p.title} className="mk-card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                  <p.icon className="h-5 w-5 text-zinc-500" />
                </span>
                <h3 className="mt-4 font-heading text-base font-medium text-zinc-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{p.body}</p>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── 4. THE SOLUTION (full-bleed green drench) ─────────────────── */}
      <section
        className="relative isolate pt-16 pb-28 text-white sm:pt-20 sm:pb-40"
        style={{
          background:
            "radial-gradient(70% 42% at 50% 0%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(165deg, #136234 0%, #0F4429 55%, #0B3520 100%)",
        }}
      >
        {/* Gradient wave: a brighter crest rising out of the white section
            above, deepening to the section's dark top so the colors blend. */}
        <SectionEdge from="#2BA85A" to="#136234" />
        {/* Dot pattern across the blend zone, fading out downward. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1.4px)",
            backgroundSize: "18px 18px",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow center tone="green">The platform</Eyebrow>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
              One platform for everything you actually do
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-emerald-50/90">
              CoWork Pro unifies the five businesses GCC operators run, with UAE and Saudi compliance built in, not
              bolted on. One login, one bill, one source of truth.
            </p>
          </Reveal>

          <StaggerGroup className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <StaggerItem
                key={m.label}
                className="flex items-center gap-3.5 rounded-2xl border border-white/20 bg-white/[0.09] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_14px_34px_-16px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/40 hover:bg-white/[0.15]"
              >
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <m.icon className="h-5 w-5 text-emerald-700" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{m.label}</p>
                  <p className="truncate text-xs text-emerald-50/85">{m.line}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ── 5. FEATURE HIGHLIGHTS (bento with rhythm) ─────────────────── */}
      <section id="features" className="relative isolate bg-white py-24 sm:py-32">
        <SectionEdge color="#FFFFFF" flip />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <Eyebrow>What you get</Eyebrow>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-[-0.02em] text-zinc-900 sm:text-4xl">
              The modules that make you money, not just manage desks
            </h2>
          </Reveal>

          <div className="mt-16 space-y-20 lg:space-y-28">
            {/* Workspace - asymmetric, mockup-led right */}
            <Reveal className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-5">
                <FeatureCopy icon={CalendarCheck} tileBg="bg-emerald-50" tileFg="text-emerald-700" title="Workspace that runs itself">
                  Bookings, desks, meeting rooms, QR check-in, credits, and recurring reservations. Members book and pay
                  from their own portal, so your front desk stops being a booking clerk.
                </FeatureCopy>
              </div>
              <div className="lg:col-span-7">
                <WorkspaceMock />
              </div>
            </Reveal>

            {/* Virtual office - reversed (mockup left, copy right) */}
            <Reveal className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
              <div className="lg:order-2 lg:col-span-5">
                <FeatureCopy icon={Mailbox} tileBg="bg-sky-50" tileFg="text-sky-600" title="Virtual office revenue">
                  Sell registered addresses, log mail and couriers, and auto-bill renewals. High margin, low effort.
                </FeatureCopy>
              </div>
              <div className="lg:order-1 lg:col-span-7">
                <VirtualOfficeMock />
              </div>
            </Reveal>

            {/* Formation + PRO - 2-up, breaks the zigzag */}
            <StaggerGroup className="grid gap-10 md:grid-cols-2 lg:gap-12">
              <StaggerItem>
                <FeatureCopy icon={Landmark} tileBg="bg-violet-50" tileFg="text-violet-600" title="Company formation CRM">
                  Track leads from first enquiry to trade license. License catalog, proposals, and application stages for
                  mainland, freezone, and Saudi MISA.
                </FeatureCopy>
                <div className="mt-6">
                  <FormationMock />
                </div>
              </StaggerItem>
              <StaggerItem>
                <FeatureCopy icon={Stamp} tileBg="bg-amber-50" tileFg="text-amber-600" title="PRO and visa tracking">
                  Manage visas, attestation, Qiwa and Muqeem tasks with SLAs and a client-visible status. Nothing expires
                  by surprise.
                </FeatureCopy>
                <div className="mt-6">
                  <ProMock />
                </div>
              </StaggerItem>
            </StaggerGroup>

            {/* WhatsApp - split */}
            <Reveal className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
              <FeatureCopy icon={MessageCircle} tileBg="bg-emerald-50" tileFg="text-emerald-700" title="WhatsApp-native">
                Confirmations, reminders, and two-way support on the channel your members actually read. Email is the
                backup, not the default.
              </FeatureCopy>
              <div>
                <WhatsAppMock />
              </div>
            </Reveal>

            {/* Billing / VAT - full-width emerald-tinted spotlight band */}
            <Reveal className="overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/50 p-8 sm:p-10">
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <FeatureCopy icon={ShieldCheck} tileBg="bg-white" tileFg="text-emerald-700" title="VAT and ZATCA compliance, handled">
                  Every invoice splits subtotal, VAT, and total automatically: 5 percent in the UAE, 15 percent in
                  Saudi. Arabic tax invoices and ZATCA e-invoicing are built in, so you stay compliant without a
                  separate accountant in the loop.
                </FeatureCopy>
                <div>
                  <InvoiceMock />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 6. WHY COWORK PRO vs WESTERN TOOLS (dark band #1) ─────────── */}
      <section id="compare" className="relative isolate py-24 text-white sm:py-32" style={{ background: "#0A0F0A" }}>
        <SectionEdge color="#0A0F0A" />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow center tone="dark">Why CoWork Pro</Eyebrow>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
              The difference between built-for-the-GCC and translated-for-it
            </h2>
          </Reveal>

          <Reveal delay={0.1} className="mt-14 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-4 font-semibold text-zinc-400">Capability</th>
                    <th className="bg-emerald-500/15 px-5 py-4 text-center font-heading font-semibold text-emerald-300">CoWork Pro</th>
                    <th className="px-5 py-4 text-center font-semibold text-zinc-400">Western tools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.cap} className="transition-colors hover:bg-white/[0.03]">
                      <td className="px-5 py-4 font-medium text-zinc-200">{row.cap}</td>
                      <td className="bg-emerald-500/[0.08] px-5 py-4 text-center">
                        <Check className="mx-auto h-5 w-5 text-emerald-400" strokeWidth={2.5} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        {row.them === false ? (
                          <X className="mx-auto h-5 w-5 text-zinc-600" strokeWidth={2.5} />
                        ) : row.them === "yes" ? (
                          <Check className="mx-auto h-5 w-5 text-zinc-500" strokeWidth={2.5} />
                        ) : (
                          <span className="text-xs font-medium text-zinc-500">{row.them}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <p className="mt-4 text-center text-xs text-zinc-500">
            Western tools refers to desk-rental platforms such as Nexudus, OfficeRnD, and Optix.
          </p>
        </div>
      </section>

      {/* ── 7. PRICING ────────────────────────────────────────────────── */}
      <div className="relative isolate" style={{ background: "#F6FAF7" }}>
        <SectionEdge color="#F6FAF7" flip />
        <PricingSection />
      </div>

      {/* ── 8. FAQ ────────────────────────────────────────────────────── */}
      <section id="faq" className="py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <Eyebrow center>FAQ</Eyebrow>
            <h2 className="mt-4 font-heading text-3xl font-bold tracking-[-0.02em] text-zinc-900 sm:text-4xl">
              Questions operators ask us
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-10 divide-y divide-zinc-100 border-y border-zinc-100">
            {FAQS.map((item) => (
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
          </Reveal>
        </div>
      </section>

      {/* ── 9. CLOSING (dark band #2 + giant wordmark) ────────────────── */}
      <section className="relative isolate text-white" style={{ background: "#0A0F0A" }}>
        <SectionEdge color="#0A0F0A" flip />
        {/* Glow + oversized wordmark, clipped to the section (the section itself
            stays overflow-visible so the top wave is not cut off). */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-x-0 bottom-0 h-3/5"
            style={{ background: "radial-gradient(60% 100% at 50% 100%, rgba(34,197,94,0.22), transparent 72%)" }}
          />
          <div
            className="absolute inset-x-0 bottom-[-0.14em] select-none whitespace-nowrap text-center font-heading font-bold leading-none tracking-[-0.04em] text-white/[0.05]"
            style={{ fontSize: "clamp(4.5rem, 19vw, 17rem)" }}
          >
            CoWork Pro
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-28 text-center sm:px-6 sm:py-36 lg:px-8">
          <Reveal>
            <h2 className="font-heading text-4xl font-bold tracking-[-0.03em] text-white sm:text-5xl">
              Stop juggling five businesses across five tools
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-zinc-400">
              Run your whole GCC operation from one platform. Free for 14 days, no card required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-white px-6 py-3 text-sm font-semibold text-emerald-800 shadow-lg shadow-emerald-500/10 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
              >
                Start free trial <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register?intent=demo"
                className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.16]"
              >
                Book a demo
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
