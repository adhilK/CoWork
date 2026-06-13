"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/business-setup/leads", label: "Pipeline" },
  { href: "/dashboard/business-setup/licenses", label: "License Catalog" },
];

export function BsTabs() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 border-b border-gray-100">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href}
            className={cn("px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              active ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700")}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
