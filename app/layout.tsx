import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CoWork Pro — Coworking Space Management",
    template: "%s | CoWork Pro",
  },
  description:
    "The most affordable coworking space management platform. Bookings, billing, members, and analytics — all in one clean dashboard.",
  keywords: ["coworking", "space management", "booking system", "member management"],
  authors: [{ name: "CoWork Pro" }],
  creator: "CoWork Pro",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_GB",
    title: "CoWork Pro — Coworking Space Management",
    description:
      "The most affordable coworking space management platform. No bloat. No $400/month bills.",
    siteName: "CoWork Pro",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              style: { fontFamily: "var(--font-inter)" },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
