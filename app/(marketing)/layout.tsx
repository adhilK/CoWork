import type { Metadata } from "next";
import localFont from "next/font/local";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

/**
 * PP Neue Montreal (licensed), self-hosted via next/font/local for zero layout
 * shift and automatic preload. Headings + eyebrows use this; body uses Inter
 * (loaded globally in the root layout). "Book" is PP Neue Montreal's 400.
 */
const ppNeueMontreal = localFont({
  src: [
    { path: "../../public/fonts/ppneuemontreal-book.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/ppneuemontreal-medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/ppneuemontreal-bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-heading",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Maktaby: The operating system for GCC workspace operators",
  description:
    "Run workspace, virtual offices, company formation, and PRO services in one platform. Built for the UAE and Saudi Arabia, with VAT, ZATCA, and WhatsApp built in.",
  openGraph: {
    title: "Maktaby for GCC workspace and business-setup operators",
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
    <div className={`${ppNeueMontreal.variable} font-sans min-h-[100dvh] bg-white text-zinc-900 antialiased`}>
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
