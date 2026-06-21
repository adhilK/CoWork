"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();

  function toggle() {
    const next = locale === "en" ? "ar" : "en";
    document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      className={className}
      title={locale === "en" ? "Switch to Arabic / تبديل إلى العربية" : "Switch to English"}
    >
      <Globe style={{ width: 17, height: 17 }} className="flex-shrink-0" />
      <span>{locale === "en" ? "العربية" : "English"}</span>
    </button>
  );
}
