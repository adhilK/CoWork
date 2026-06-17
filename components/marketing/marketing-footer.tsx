import Link from "next/link";
import { MaktabyLogo } from "@/components/ui/maktaby-logo";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Platform",
    links: [
      { label: "Workspace", href: "#features" },
      { label: "Virtual office", href: "#features" },
      { label: "Business setup CRM", href: "#features" },
      { label: "PRO services", href: "#features" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Why Maktaby", href: "#compare" },
      { label: "Book a demo", href: "/register?intent=demo" },
      { label: "Sign in", href: "/login" },
      { label: "Start free trial", href: "/register" },
    ],
  },
  {
    heading: "Markets",
    links: [
      { label: "United Arab Emirates", href: "#pricing" },
      { label: "Saudi Arabia", href: "#pricing" },
      { label: "Bahrain, Qatar, Kuwait, Oman", href: "#pricing" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer style={{ background: "#0A0F0A" }} className="text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-start">
              <MaktabyLogo variant="dark" size="sm" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-zinc-500">
              The operating system for GCC workspace and business-setup operators. Built for the UAE and Saudi Arabia.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="font-heading text-sm font-semibold text-white">{col.heading}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-zinc-400 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-zinc-500">
            {new Date().getFullYear()} Maktaby. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm text-zinc-500 hover:text-white">Privacy</Link>
            <Link href="#" className="text-sm text-zinc-500 hover:text-white">Terms</Link>
            <span className="text-sm text-zinc-500">Dubai, Riyadh</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
