export function isDarkColor(color: string | null | undefined): boolean {
  if (!color) return false;
  let c = color.trim().replace(/^#/, "");
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  // Perceived brightness formula (YIQ)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 135;
}

export function computeThemeCssVariables({
  accent,
  accentSoft,
  sidebarBg,
  background,
}: {
  accent: string;
  accentSoft?: string;
  sidebarBg?: string;
  background?: string;
}) {
  const isDarkBg = isDarkColor(background);
  const isDarkSidebar = isDarkColor(sidebarBg);

  const soft = accentSoft || `${accent}22`;
  const isDarkAccent = isDarkColor(accent);
  const accentFg = isDarkAccent ? "#ffffff" : "#0f172a";

  const vars: Record<string, string> = {
    "--accent": accent,
    "--accent-soft": soft,
    "--accent-foreground": accentFg,
    "--ring": `${accent}33`,
  };

  if (sidebarBg) {
    vars["--sidebar-bg"] = sidebarBg;
  }

  if (isDarkSidebar) {
    vars["--sidebar-fg"] = "#f8fafc";
    vars["--sidebar-muted"] = "#94a3b8";
    vars["--sidebar-muted-strong"] = "#cbd5e1";
    vars["--sidebar-border"] = "rgba(255, 255, 255, 0.12)";
    vars["--sidebar-hover"] = "rgba(255, 255, 255, 0.08)";
    vars["--sidebar-card-bg"] = "rgba(255, 255, 255, 0.06)";
    vars["--sidebar-card-border"] = "rgba(255, 255, 255, 0.12)";
  } else {
    vars["--sidebar-fg"] = isDarkBg ? "#f8fafc" : "var(--foreground)";
    vars["--sidebar-muted"] = isDarkBg ? "#94a3b8" : "var(--muted)";
    vars["--sidebar-muted-strong"] = isDarkBg ? "#cbd5e1" : "var(--muted-strong)";
    vars["--sidebar-border"] = isDarkBg ? "rgba(255, 255, 255, 0.12)" : "var(--border-strong)";
    vars["--sidebar-hover"] = isDarkBg ? "rgba(255, 255, 255, 0.06)" : "var(--surface-soft)";
    vars["--sidebar-card-bg"] = isDarkBg ? "rgba(255, 255, 255, 0.05)" : "var(--card)";
    vars["--sidebar-card-border"] = isDarkBg ? "rgba(255, 255, 255, 0.1)" : "var(--border)";
  }

  if (background) {
    vars["--background"] = background;
    if (isDarkBg) {
      vars["--foreground"] = "#f8fafc";
      vars["--card"] = "#141c2e";
      vars["--surface-soft"] = "rgba(255, 255, 255, 0.05)";
      vars["--background-alt"] = "rgba(255, 255, 255, 0.07)";
      vars["--control-bg"] = "rgba(255, 255, 255, 0.06)";
      vars["--border"] = "rgba(255, 255, 255, 0.12)";
      vars["--border-strong"] = "rgba(255, 255, 255, 0.2)";
      vars["--muted"] = "#94a3b8";
      vars["--muted-strong"] = "#cbd5e1";
    }
  }

  return { vars, isDarkBg, isDarkSidebar };
}
