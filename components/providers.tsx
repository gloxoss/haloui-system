"use client";

import { DatesProvider } from "@mantine/dates";
import { MantineProvider } from "@mantine/core";
import { SessionProvider } from "next-auth/react";

import { mantineTheme } from "@/lib/mantine-theme";
import { I18nProvider, type SupportedLocale } from "@/lib/i18n";

export function Providers({
  children,
  initialLocale = "fr",
}: {
  children: React.ReactNode;
  initialLocale?: SupportedLocale;
}) {
  return (
    <SessionProvider>
      <I18nProvider initialLocale={initialLocale}>
        <MantineProvider theme={mantineTheme} defaultColorScheme="light">
          <DatesProvider settings={{ locale: initialLocale === "ar" ? "fr" : "fr" }}>
            {children}
          </DatesProvider>
        </MantineProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
