import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = locale === "ar";

  return (
    <html
      lang={locale}
      dir={isRtl ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            {children}
            <Toaster
              position={isRtl ? "top-left" : "top-right"}
              richColors
              toastOptions={{
                style: { fontFamily: "var(--font-inter)" },
              }}
            />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
