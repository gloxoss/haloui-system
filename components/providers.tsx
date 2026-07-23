"use client";

import { DatesProvider } from "@mantine/dates";
import { MantineProvider } from "@mantine/core";
import { SessionProvider } from "next-auth/react";

import { mantineTheme } from "@/lib/mantine-theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MantineProvider theme={mantineTheme} defaultColorScheme="light">
        <DatesProvider settings={{ locale: "fr" }}>{children}</DatesProvider>
      </MantineProvider>
    </SessionProvider>
  );
}
