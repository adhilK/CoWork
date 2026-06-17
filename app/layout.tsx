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
    default: "Maktaby — GCC Workspace Management",
    template: "%s | Maktaby",
  },
  description:
    "The operating system for GCC coworking and business-setup operators. Workspace, virtual offices, company formation, and PRO services — all in one platform.",
  keywords: ["coworking", "space management", "virtual office", "company formation", "UAE", "Saudi Arabia", "GCC"],
  authors: [{ name: "Maktaby" }],
  creator: "Maktaby",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_AE",
    title: "Maktaby — GCC Workspace Management",
    description:
      "The operating system for GCC workspace and business-setup operators. Built for UAE and Saudi Arabia.",
    siteName: "Maktaby",
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
