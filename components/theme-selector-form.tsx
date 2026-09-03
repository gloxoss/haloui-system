"use client";

import * as React from "react";
import { saveThemeSettingsAction } from "@/app/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { THEME_DENSITY_DEFINITIONS, THEME_PRESET_DEFINITIONS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { type ThemeDensity, type ThemePreset, type ThemeSettings } from "@/lib/types";
import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { Check, Palette, RotateCcw, Sparkles } from "lucide-react";

const THEME_AR: Record<string, { label: string; desc: string }> = {
  "slate-minimal": { label: "رمادي أردواز كلاسيكي", desc: "تصميم هادئ ونظيف بخلفية بيضاء ورمادي عصري." },
  "corporate-navy": { label: "أزرق ملكي للشركات", desc: "أزرق احترافي فخم مع تباين قوي ومريح للعين." },
  "emerald-luxe": { label: "زمردي حديث", desc: "أخضر مالي وراقي كيعطي انطباع بالاستقرار والثقة." },
  "indigo-royal": { label: "إنديجو ملكي", desc: "ألوان عصرية مائلة للبنفسجي بتقنية حديثة." },
  "crimson-executive": { label: "بوردي وعنابي للإدارة", desc: "أحمر داكن مميز للمدراء والشركات الكبرى." },
  "ocean-cyan": { label: "أزرق محيطي سيان", desc: "أزرق بحري مع سيان منعش وديناميكي." },
  "sunset-amber": { label: "نحاسي وأمبر دافئ", desc: "ألوان ترابية ودافئة مريحة للمصانع والورشات." },
  "violet-plum": { label: "برقوقي وبنفسجي مميز", desc: "درجات ألوان راقية تعبر عن الإبداع والتميز." },
  "monochrome-black": { label: "أبيض وأسود رسمي", desc: "أسلوب بسيط ودقيق: أبيض وأسود صافي وواضح." },
  "olive-ledger": { label: "أوليف وزيتوني كلاسيكي", desc: "طابع هادئ واحترافي للمحاسبة والمكاتب." },
  "haloui-classic": { label: "عنبري دافئ", desc: "ألوان ذهبية وعنبرية حرفية دافئة." },
  custom: { label: "ألوان مخصصة بالكامل", desc: "اختر ألوان هويتك البصرية بدقة وبنقرة واحدة." },
};

const DENSITY_AR: Record<string, { label: string; desc: string }> = {
  compact: { label: "مظهر مدمج وسريع (Compact)", desc: "عرض أكبر كمية من البيانات في الشاشة الواحدة." },
  comfortable: { label: "مظهر مريح ومتباعد (Confortable)", desc: "مسافات أوسع وخطوط واضحة للمطالعة المريحة." },
};

const QUICK_BRAND_PRESETS = [
  {
    name: "Station-Service & Énergie",
    accent: "#eab308",
    accentSoft: "#fef9c3",
    sidebarBg: "#0f172a",
    background: "#f8fafc",
  },
  {
    name: "Transport & BTP",
    accent: "#ea580c",
    accentSoft: "#ffedd5",
    sidebarBg: "#1e293b",
    background: "#f8fafc",
  },
  {
    name: "Pharmacie & Santé",
    accent: "#10b981",
    accentSoft: "#d1fae5",
    sidebarBg: "#ffffff",
    background: "#f8fafc",
  },
  {
    name: "Finance & Conseil",
    accent: "#2563eb",
    accentSoft: "#dbeafe",
    sidebarBg: "#0f172a",
    background: "#f8fafc",
  },
  {
    name: "Luxe, Or & Prestige",
    accent: "#d97706",
    accentSoft: "#fef3c7",
    sidebarBg: "#09090b",
    background: "#fafaf9",
  },
  {
    name: "Tech & Innovation",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
    sidebarBg: "#18181b",
    background: "#f8fafc",
  },
];

export function ThemeSelectorForm({ initialSettings }: { initialSettings: ThemeSettings }) {
  const { t, locale } = useTranslation();
  const [currentPreset, setCurrentPreset] = React.useState<ThemePreset>(initialSettings.preset);
  const [currentDensity, setCurrentDensity] = React.useState<ThemeDensity>(initialSettings.density);
  const [applied, setApplied] = React.useState(false);

  // Custom colors state
  const [customAccent, setCustomAccent] = React.useState<string>(
    initialSettings.customColors?.accent || "#2563eb"
  );
  const [customAccentSoft, setCustomAccentSoft] = React.useState<string>(
    initialSettings.customColors?.accentSoft || "#eff6ff"
  );
  const [customSidebarBg, setCustomSidebarBg] = React.useState<string>(
    initialSettings.customColors?.sidebarBg || "#ffffff"
  );
  const [customBg, setCustomBg] = React.useState<string>(
    initialSettings.customColors?.background || "#f8fafc"
  );

  const applyCustomColorsToDom = React.useCallback(
    (accent: string, soft: string, sidebar: string, bg: string) => {
      document.documentElement.setAttribute("data-ui-theme", "custom");
      document.body.setAttribute("data-ui-theme", "custom");
      document.querySelectorAll("[data-ui-theme]").forEach((el) => {
        el.setAttribute("data-ui-theme", "custom");
      });

      document.documentElement.style.setProperty("--accent", accent);
      document.documentElement.style.setProperty("--accent-soft", soft);
      document.documentElement.style.setProperty("--accent-foreground", "#ffffff");
      document.documentElement.style.setProperty("--ring", `${accent}33`);
      document.documentElement.style.setProperty("--sidebar-bg", sidebar);
      document.documentElement.style.setProperty("--background", bg);
    },
    []
  );

  const clearCustomStylesFromDom = React.useCallback(() => {
    document.documentElement.style.removeProperty("--accent");
    document.documentElement.style.removeProperty("--accent-soft");
    document.documentElement.style.removeProperty("--accent-foreground");
    document.documentElement.style.removeProperty("--ring");
    document.documentElement.style.removeProperty("--sidebar-bg");
    document.documentElement.style.removeProperty("--background");
  }, []);

  const handlePresetChange = (preset: ThemePreset) => {
    setCurrentPreset(preset);

    if (preset === "custom") {
      applyCustomColorsToDom(customAccent, customAccentSoft, customSidebarBg, customBg);
    } else {
      clearCustomStylesFromDom();
      document.documentElement.setAttribute("data-ui-theme", preset);
      document.body.setAttribute("data-ui-theme", preset);
      document.querySelectorAll("[data-ui-theme]").forEach((el) => {
        el.setAttribute("data-ui-theme", preset);
      });
    }
  };

  const handleDensityChange = (density: ThemeDensity) => {
    setCurrentDensity(density);
    document.documentElement.setAttribute("data-ui-density", density);
    document.querySelectorAll("[data-ui-density]").forEach((el) => {
      el.setAttribute("data-ui-density", density);
    });
  };

  const handleCustomAccentChange = (color: string) => {
    setCustomAccent(color);
    // Auto-calculate soft tint if not explicitly set
    const soft = `${color}20`;
    setCustomAccentSoft(soft);
    setCurrentPreset("custom");
    applyCustomColorsToDom(color, soft, customSidebarBg, customBg);
  };

  const handleCustomSidebarChange = (color: string) => {
    setCustomSidebarBg(color);
    setCurrentPreset("custom");
    applyCustomColorsToDom(customAccent, customAccentSoft, color, customBg);
  };

  const handleCustomBgChange = (color: string) => {
    setCustomBg(color);
    setCurrentPreset("custom");
    applyCustomColorsToDom(customAccent, customAccentSoft, customSidebarBg, color);
  };

  const handleApplyQuickPreset = (preset: (typeof QUICK_BRAND_PRESETS)[0]) => {
    setCustomAccent(preset.accent);
    setCustomAccentSoft(preset.accentSoft);
    setCustomSidebarBg(preset.sidebarBg);
    setCustomBg(preset.background);
    setCurrentPreset("custom");
    applyCustomColorsToDom(preset.accent, preset.accentSoft, preset.sidebarBg, preset.background);
  };

  return (
    <form
      action={async (formData) => {
        await saveThemeSettingsAction(formData);
        setApplied(true);
        setTimeout(() => setApplied(false), 3000);
      }}
      className="grid gap-5"
    >
      <input type="hidden" name="theme_preset" value={currentPreset} />
      <input type="hidden" name="theme_density" value={currentDensity} />
      <input type="hidden" name="custom_accent" value={customAccent} />
      <input type="hidden" name="custom_accent_soft" value={customAccentSoft} />
      <input type="hidden" name="custom_sidebar_bg" value={customSidebarBg} />
      <input type="hidden" name="custom_bg" value={customBg} />

      {/* Preset Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_PRESET_DEFINITIONS.map((theme) => {
          const isChecked = currentPreset === theme.key;
          const themeLabel = locale === "ar" && THEME_AR[theme.key] ? THEME_AR[theme.key].label : theme.label;
          const themeDesc = locale === "ar" && THEME_AR[theme.key] ? THEME_AR[theme.key].desc : theme.description;

          // For custom card, show user's selected custom colors in the swatch preview
          const displaySwatches =
            theme.key === "custom"
              ? [customAccent, customSidebarBg, customAccentSoft]
              : theme.swatches;

          return (
            <label
              key={theme.key}
              onClick={() => handlePresetChange(theme.key as ThemePreset)}
              className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 transition-all duration-200 hover:border-[var(--accent)] hover:shadow-xs has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--surface-soft)] has-[:checked]:ring-2 has-[:checked]:ring-[var(--accent)]/20"
            >
              <div className="flex items-center justify-between gap-2">
                {/* Color Swatch Previews */}
                <div className="flex items-center gap-1.5">
                  {displaySwatches?.map((color, idx) => (
                    <span
                      key={idx}
                      className="h-4 w-4 rounded-full border border-black/10 shadow-xs transition-transform group-hover:scale-110"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  {theme.key === "custom" ? (
                    <span className="ml-1 text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
                      Live
                    </span>
                  ) : null}
                </div>

                <input
                  type="radio"
                  name="radio_preset_selector"
                  value={theme.key}
                  checked={isChecked}
                  onChange={() => handlePresetChange(theme.key as ThemePreset)}
                  className="h-4 w-4 accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div className="mt-2.5">
                <span className="text-sm font-extrabold text-[var(--foreground)] group-hover:text-[var(--accent)]">
                  {themeLabel}
                </span>
                <p className="mt-0.5 text-xs text-[var(--muted)] leading-relaxed">
                  {themeDesc}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Custom Color Studio Builder (Visible when custom is active or for fast tweaking) */}
      <Paper
        radius="xl"
        withBorder
        p={{ base: "md", md: "lg" }}
        className="bg-[var(--surface-soft)] border-[var(--accent)]/30 shadow-xs"
      >
        <Stack gap="md">
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="xs">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-xs">
                <Palette size={16} />
              </span>
              <div>
                <Text size="sm" fw={800} className="text-[var(--foreground)]">
                  Studio des Couleurs Personnalisées (Sur-Mesure)
                </Text>
                <Text size="xs" c="dimmed">
                  Personnalisez précisément les codes couleurs pour correspondre au logo et à l'identité visuelle de votre client.
                </Text>
              </div>
            </Group>

            <Badge variant="light" color="blue" size="sm">
              Prévisualisation Instantanée
            </Badge>
          </Group>

          {/* Quick Palettes */}
          <div>
            <Text size="xs" fw={700} c="dimmed" mb={6}>
              Inspirations sectorielles rapides (en 1 clic) :
            </Text>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {QUICK_BRAND_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyQuickPreset(p)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-center transition hover:border-[var(--accent)] hover:shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.accent }} />
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.sidebarBg }} />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--foreground)] truncate w-full">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Individual Color Pickers */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Color 1: Accent */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
              <span className="text-xs font-bold text-[var(--foreground)]">
                1. Couleur Principale (Boutons & Accent)
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                Utilisée pour les boutons, liens et onglets actifs.
              </span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={customAccent}
                  onChange={(e) => handleCustomAccentChange(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={customAccent}
                  onChange={(e) => handleCustomAccentChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--foreground)] uppercase"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            {/* Color 2: Sidebar */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
              <span className="text-xs font-bold text-[var(--foreground)]">
                2. Barre Latérale (Menu de navigation)
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                Fond du menu latéral gauche.
              </span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={customSidebarBg}
                  onChange={(e) => handleCustomSidebarChange(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={customSidebarBg}
                  onChange={(e) => handleCustomSidebarChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--foreground)] uppercase"
                  placeholder="#ffffff"
                />
              </div>
            </div>

            {/* Color 3: Background */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
              <span className="text-xs font-bold text-[var(--foreground)]">
                3. Fond de l'Application
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                Arrière-plan général des pages.
              </span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={customBg}
                  onChange={(e) => handleCustomBgChange(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={customBg}
                  onChange={(e) => handleCustomBgChange(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-mono font-bold text-[var(--foreground)] uppercase"
                  placeholder="#f8fafc"
                />
              </div>
            </div>
          </div>
        </Stack>
      </Paper>

      {/* Density Selector */}
      <div className="grid gap-3 sm:grid-cols-2">
        {THEME_DENSITY_DEFINITIONS.map((density) => {
          const densityLabel = locale === "ar" && DENSITY_AR[density.key] ? DENSITY_AR[density.key].label : density.label;
          const densityDesc = locale === "ar" && DENSITY_AR[density.key] ? DENSITY_AR[density.key].desc : density.description;

          return (
            <label
              key={density.key}
              onClick={() => handleDensityChange(density.key as ThemeDensity)}
              className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-3.5 py-3 transition-all duration-200 hover:border-[var(--accent)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--surface-soft)]"
            >
              <input
                type="radio"
                name="radio_density_selector"
                value={density.key}
                checked={currentDensity === density.key}
                onChange={() => handleDensityChange(density.key as ThemeDensity)}
                className="mt-1 h-4 w-4 accent-[var(--accent)] cursor-pointer"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-bold text-[var(--foreground)]">{densityLabel}</span>
                <span className="text-xs text-[var(--muted)]">{densityDesc}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{t.settings.applyTheme}</SubmitButton>
        {applied ? (
          <span className="text-xs font-bold text-emerald-600 animate-in fade-in">
            {t.settings.themeSaved}
          </span>
        ) : null}
      </div>
    </form>
  );
}
