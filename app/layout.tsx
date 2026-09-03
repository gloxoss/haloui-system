import type { Metadata } from "next";
import { ColorSchemeScript } from "@mantine/core";
import { Lora, Manrope, Noto_Naskh_Arabic } from "next/font/google";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@/app/globals.css";

import { APP_NAME } from "@/lib/constants";
import { Providers } from "@/components/providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-print-serif",
  weight: ["400", "600", "700"],
});

const naskh = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Système de gestion commerciale : devis, factures, bons, produits, clients et recettes.",
};

import { cookies } from "next/headers";
import { getThemeSettings } from "@/lib/data";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeSetting = getThemeSettings();
  const preset = cookieStore.get("app_theme")?.value || themeSetting.preset;
  const density = cookieStore.get("app_density")?.value || themeSetting.density;
  const locale = (cookieStore.get("app_locale")?.value as "fr" | "ar") || "fr";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-mantine-color-scheme="light"
      data-ui-theme={preset}
      data-ui-density={density}
      className={locale === "ar" ? "rtl" : ""}
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        {preset === "custom" && themeSetting.customColors ? (
          <style id="custom-theme-vars" dangerouslySetInnerHTML={{ __html: `
            :root, [data-ui-theme="custom"] {
              --accent: ${themeSetting.customColors.accent} !important;
              --accent-soft: ${themeSetting.customColors.accentSoft || themeSetting.customColors.accent + "22"} !important;
              --accent-foreground: #ffffff !important;
              --ring: ${themeSetting.customColors.accent}33 !important;
              ${themeSetting.customColors.sidebarBg ? `--sidebar-bg: ${themeSetting.customColors.sidebarBg} !important;` : ""}
              ${themeSetting.customColors.background ? `--background: ${themeSetting.customColors.background} !important;` : ""}
            }
          ` }} />
        ) : null}
      </head>
      <body className={`${manrope.variable} ${lora.variable} ${naskh.variable} bg-[var(--background)] text-[var(--foreground)] antialiased`}>
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
