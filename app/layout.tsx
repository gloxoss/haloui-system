import type { Metadata } from "next";
import { Lora, Manrope, Noto_Naskh_Arabic } from "next/font/google";

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
  description: "Gestion locale des devis, factures, personnel et chiffre d'affaires de Pâtisserie Haloui.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${manrope.variable} ${lora.variable} ${naskh.variable} bg-[var(--background)] text-[var(--foreground)] antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
