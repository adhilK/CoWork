"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Menu, X } from "lucide-react";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#features", label: "Platform" },
  { href: "#compare", label: "Why CoWork Pro" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-[10px]"
            style={{ background: "linear-gradient(135deg, #22C55E, #15803D)" }}
          >
            <Building2 className="h-[18px] w-[18px] text-white" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight text-zinc-900">CoWork Pro</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
          >
            Start free trial
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-zinc-100 bg-white px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {l.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
            <Link href="/login" className="rounded-full border border-zinc-200 px-4 py-2.5 text-center text-sm font-semibold text-zinc-800">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-full px-4 py-2.5 text-center text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #16A34A, #15803D)" }}
            >
              Start free trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
