import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED = ["en", "ar"] as const;
type Locale = (typeof SUPPORTED)[number];

function resolveLocale(raw: string | undefined): Locale {
  return SUPPORTED.includes(raw as Locale) ? (raw as Locale) : "en";
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
