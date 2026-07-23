import { createTheme, rem } from "@mantine/core";

export const mantineTheme = createTheme({
  fontFamily: "var(--font-ui), sans-serif",
  headings: {
    fontFamily: "var(--font-ui), sans-serif",
    fontWeight: "800",
  },
  primaryColor: "brand",
  primaryShade: 6,
  colors: {
    brand: [
      "#eef4f8",
      "#dbe8f1",
      "#c1d8e6",
      "#a4c7db",
      "#84b5d0",
      "#679fc1",
      "#4d86a7",
      "#3f6f8a",
      "#355d72",
      "#2d4f60",
    ],
  },
  defaultRadius: "md",
  radius: {
    xs: rem(10),
    sm: rem(12),
    md: rem(16),
    lg: rem(20),
    xl: rem(28),
  },
  spacing: {
    xs: rem(8),
    sm: rem(12),
    md: rem(16),
    lg: rem(20),
    xl: rem(28),
  },
  shadows: {
    xs: "0 1px 2px rgba(15, 23, 42, 0.04)",
    sm: "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 24px rgba(15, 23, 42, 0.05)",
    md: "0 18px 36px rgba(15, 23, 42, 0.07)",
    lg: "0 24px 56px rgba(15, 23, 42, 0.11)",
  },
  other: {
    appBackground: "var(--background)",
    appCard: "var(--card)",
    appBorder: "var(--border-strong)",
    appMuted: "var(--muted)",
  },
});
