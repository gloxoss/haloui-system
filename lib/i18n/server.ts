import { cookies } from "next/headers";
import { ar } from "@/lib/i18n/translations/ar";
import { fr } from "@/lib/i18n/translations/fr";
import { type SupportedLocale, type TranslationDictionary } from "@/lib/i18n/types";

export async function getServerLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("app_locale")?.value;
  return raw === "ar" ? "ar" : "fr";
}

export function getServerDictionary(locale: SupportedLocale = "fr"): TranslationDictionary {
  return locale === "ar" ? ar : fr;
}

export function getDirection(locale: SupportedLocale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
