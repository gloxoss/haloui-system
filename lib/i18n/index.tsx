"use client";

import * as React from "react";
import { setLocaleAction } from "@/app/actions";
import { ar } from "@/lib/i18n/translations/ar";
import { fr } from "@/lib/i18n/translations/fr";
import { type SupportedLocale, type TranslationDictionary } from "@/lib/i18n/types";

export * from "@/lib/i18n/types";

const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
  fr,
  ar,
};

type I18nContextType = {
  locale: SupportedLocale;
  dir: "ltr" | "rtl";
  t: TranslationDictionary;
  setLocale: (newLocale: SupportedLocale) => Promise<void>;
  isRtl: boolean;
};

const I18nContext = React.createContext<I18nContextType>({
  locale: "fr",
  dir: "ltr",
  t: fr,
  setLocale: async () => {},
  isRtl: false,
});

export function I18nProvider({
  initialLocale = "fr",
  children,
}: {
  initialLocale?: SupportedLocale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = React.useState<SupportedLocale>(initialLocale);

  const setLocale = React.useCallback(async (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = newLocale;
      document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
      if (newLocale === "ar") {
        document.documentElement.classList.add("rtl");
      } else {
        document.documentElement.classList.remove("rtl");
      }
    }
    await setLocaleAction(newLocale);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const isRtl = locale === "ar";
  const t = dictionaries[locale] || fr;

  return (
    <I18nContext.Provider value={{ locale, dir, t, setLocale, isRtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = React.useContext(I18nContext);
  if (!context) {
    return {
      locale: "fr" as SupportedLocale,
      dir: "ltr" as const,
      t: fr,
      setLocale: async () => {},
      isRtl: false,
    };
  }
  return context;
}

export function getDictionary(locale: SupportedLocale = "fr"): TranslationDictionary {
  return dictionaries[locale] || fr;
}
