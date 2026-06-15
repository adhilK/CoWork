import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export const metadata: Metadata = {
  title: "CoWork Pro: The operating system for GCC workspace operators",
  description:
    "Run workspace, virtual offices, company formation, and PRO services in one platform. Built for the UAE and Saudi Arabia, with VAT, ZATCA, and WhatsApp built in.",
  openGraph: {
    title: "CoWork Pro for GCC workspace and business-setup operators",
    description:
      "One platform for desks, virtual offices, company formation, PRO services, and member billing. UAE and Saudi compliance from day one.",
    type: "website",
  },
};

/**
 * Public marketing layout. Deliberately separate from the dashboard and member
 * portal shells: a slim sticky nav, the page content, and a footer. No auth,
 * no sidebar. Light theme, locked.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-white text-zinc-900 antialiased">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
