"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useScroll, useMotionValueEvent } from "motion/react";
import { cn } from "@/lib/utils";
import { MaktabyLogo } from "@/components/ui/maktaby-logo";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#features", label: "Platform" },
  { href: "#compare", label: "Why Maktaby" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  // Toggle the floating-pill state past a small threshold. useMotionValueEvent
  // reads the scroll position without a scroll listener or per-frame re-render.
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    // Constant outer height keeps the morph from reflowing the page (no CLS).
    <header className="sticky top-0 z-50 h-[72px]">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex w-full items-center justify-between transition-all duration-300 ease-out",
            scrolled
              ? "rounded-full border border-zinc-200/70 bg-white/75 px-4 py-2.5 shadow-lg shadow-zinc-900/[0.06] backdrop-blur-md lg:mx-auto lg:max-w-5xl lg:px-5"
              : "border border-transparent bg-transparent px-0 py-4"
          )}
        >
          {/* Brand */}
          <Link href="/" className="flex items-center">
            <MaktabyLogo variant="light" size="xs" />
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-emerald-500 transition-transform duration-200 ease-out group-hover:scale-x-100" />
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
              className="rounded-[10px] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
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
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="mx-3 mt-1 rounded-2xl border border-zinc-200/70 bg-white/95 px-4 py-4 shadow-xl shadow-zinc-900/10 backdrop-blur-md lg:hidden">
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
            <Link href="/login" className="rounded-[10px] border border-zinc-200 px-4 py-2.5 text-center text-sm font-semibold text-zinc-800">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-[10px] px-4 py-2.5 text-center text-sm font-semibold text-white"
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
