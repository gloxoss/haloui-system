import type { Metadata, Viewport } from "next";
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
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#315d7b",
};

import { cookies } from "next/headers";
import { getThemeSettings } from "@/lib/data";
import { computeThemeCssVariables } from "@/lib/theme-utils";

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

  const isDarkPreset = preset === "dark-executive";
  const customVarsResult = preset === "custom" && themeSetting.customColors
    ? computeThemeCssVariables({
        accent: themeSetting.customColors.accent,
        accentSoft: themeSetting.customColors.accentSoft,
        sidebarBg: themeSetting.customColors.sidebarBg,
        background: themeSetting.customColors.background,
      })
    : null;

  const isDark = isDarkPreset || Boolean(customVarsResult?.isDarkBg);
  const isDarkSidebar = isDarkPreset || Boolean(customVarsResult?.isDarkSidebar);

  const customCssString = customVarsResult
    ? Object.entries(customVarsResult.vars)
        .map(([k, v]) => `${k}: ${v} !important;`)
        .join("\n")
    : "";

  return (
    <html
      lang={locale}
      dir={dir}
      data-mantine-color-scheme={isDark ? "dark" : "light"}
      data-dark-bg={isDark ? "true" : undefined}
      data-dark-sidebar={isDarkSidebar ? "true" : undefined}
      data-ui-theme={preset}
      data-ui-density={density}
      className={locale === "ar" ? "rtl" : ""}
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript defaultColorScheme={isDark ? "dark" : "light"} />
        {customCssString ? (
          <style id="custom-theme-vars" dangerouslySetInnerHTML={{ __html: `
            :root, [data-ui-theme="custom"] {
              ${customCssString}
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
